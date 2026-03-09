import posixpath
import re
import urllib.request
from typing import (
    Any,
    NamedTuple,
    Optional,
    Union,
)
from urllib.error import HTTPError
from urllib.parse import (
    quote,
    urlparse,
)

from galaxy.exceptions import (
    AuthenticationRequired,
    ConfigurationError,
    MessageException,
    ObjectNotFound,
    RequestParameterInvalidException,
)
from galaxy.files.models import (
    AnyRemoteEntry,
    BaseFileSourceConfiguration,
    BaseFileSourceTemplateConfiguration,
    Entry,
    EntryData,
    FilesSourceRuntimeContext,
    RemoteDirectory,
    RemoteFile,
    RemoteFileHash,
)
from galaxy.files.sources import (
    DEFAULT_PAGE_LIMIT,
    BaseFilesSource,
    PluginKind,
)
from galaxy.files.sources._defaults import DEFAULT_SCHEME
from galaxy.util import (
    DEFAULT_SOCKET_TIMEOUT,
    get_charset_from_http_headers,
    requests,
    stream_to_open_named_file,
)
from galaxy.util.config_templates import TemplateExpansion

DEFAULT_OSF_REPOSITORY_URL = "https://osf.io"
DEFAULT_OSF_API_URL = "https://api.osf.io/v2"
DEFAULT_NODE_PAGE_SIZE = 100


class OSFFileSourceTemplateConfiguration(BaseFileSourceTemplateConfiguration):
    url: Optional[Union[str, TemplateExpansion]] = DEFAULT_OSF_REPOSITORY_URL
    token: Optional[Union[str, TemplateExpansion]] = None
    node_id: Optional[Union[str, TemplateExpansion]] = None
    provider: Optional[Union[str, TemplateExpansion]] = None


class OSFFileSourceConfiguration(BaseFileSourceConfiguration):
    url: Optional[str] = DEFAULT_OSF_REPOSITORY_URL
    token: Optional[str] = None
    node_id: Optional[str] = None
    provider: Optional[str] = None


class OSFPath(NamedTuple):
    node_id: Optional[str]
    provider: Optional[str]
    materialized_path: str


class OSFFilesSource(BaseFilesSource[OSFFileSourceTemplateConfiguration, OSFFileSourceConfiguration]):
    plugin_type = "osf"
    plugin_kind = PluginKind.rfs
    supports_pagination = True
    supports_search = True

    template_config_class = OSFFileSourceTemplateConfiguration
    resolved_config_class = OSFFileSourceConfiguration

    def __init__(self, template_config: OSFFileSourceTemplateConfiguration):
        super().__init__(template_config)
        if self.template_config.provider and not self.template_config.node_id:
            raise ConfigurationError("The OSF file source requires 'node_id' when 'provider' is configured.")
        scheme = re.escape(self.get_scheme())
        source_id = re.escape(self.id)
        legacy_scheme = re.escape(DEFAULT_SCHEME)
        self._scheme_regex = re.compile(rf"^(?:{scheme}|{legacy_scheme})://{source_id}")

    def get_scheme(self) -> str:
        return self.scheme if self.scheme and self.scheme != DEFAULT_SCHEME else self.plugin_type

    def get_url(self) -> Optional[str]:
        return self._repository_base_url(self.template_config.url)

    def score_url_match(self, url: str) -> int:
        if match := self._scheme_regex.match(url):
            return match.span()[1]
        return 0

    def to_relative_path(self, url: str) -> str:
        legacy_uri_root = f"{DEFAULT_SCHEME}://{self.id}"
        if url.startswith(legacy_uri_root):
            return url[len(legacy_uri_root) :] or "/"
        return super().to_relative_path(url)

    def _list(
        self,
        context: FilesSourceRuntimeContext[OSFFileSourceConfiguration],
        path="/",
        recursive=False,
        write_intent: bool = False,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        query: Optional[str] = None,
        sort_by: Optional[str] = None,
    ) -> tuple[list[AnyRemoteEntry], int]:
        del sort_by
        if path == "/":
            if context.config.node_id and context.config.provider:
                return self._list_provider_path(
                    context,
                    context.config.node_id,
                    context.config.provider,
                    "/",
                    recursive,
                    write_intent,
                    limit,
                    offset,
                    query,
                )
            if context.config.node_id:
                return self._list_node_providers(
                    context,
                    context.config.node_id,
                    write_intent=write_intent,
                    limit=limit,
                    offset=offset,
                    query=query,
                )
            return self._list_nodes(context, write_intent=write_intent, limit=limit, offset=offset, query=query)

        resolved_path = self._resolve_path(path, context)
        if resolved_path.node_id is None:
            raise RequestParameterInvalidException(f"Invalid OSF path [{path}].")
        if resolved_path.provider is None:
            return self._list_node_providers(
                context,
                resolved_path.node_id,
                write_intent=write_intent,
                limit=limit,
                offset=offset,
                query=query,
            )
        return self._list_provider_path(
            context,
            resolved_path.node_id,
            resolved_path.provider,
            resolved_path.materialized_path,
            recursive,
            write_intent,
            limit,
            offset,
            query,
        )

    def _create_entry(
        self, entry_data: EntryData, context: FilesSourceRuntimeContext[OSFFileSourceConfiguration]
    ) -> Entry:
        if "/" in entry_data.name:
            raise RequestParameterInvalidException("OSF folder names cannot contain '/'.")
        target = getattr(entry_data, "target", None)
        if not isinstance(target, str):
            raise RequestParameterInvalidException("OSF folder creation requires a target URI.")
        target_path = self.to_relative_path(target)
        resolved_path = self._resolve_path(target_path, context)
        self._ensure_writable_container_target(resolved_path, action="create a folder")

        self._ensure_node_writable(resolved_path.node_id, context)
        folder_entry = self._get_entry_by_materialized_path(
            resolved_path.node_id,
            resolved_path.provider,
            resolved_path.materialized_path,
            context,
            expected_kind="folder",
        )
        new_folder_url = folder_entry["links"].get("new_folder")
        if not new_folder_url:
            raise MessageException("The selected OSF location does not allow folder creation.")
        response = self._request(
            "PUT",
            new_folder_url,
            context,
            params={"name": entry_data.name},
            expected_status_codes={201},
            auth_required=True,
        )
        del response
        new_path = posixpath.join(
            self._entry_to_path(resolved_path.node_id, resolved_path.provider, folder_entry), entry_data.name
        )
        return Entry(name=entry_data.name, uri=self.uri_from_path(new_path), external_link=None)

    def _realize_to(
        self, source_path: str, native_path: str, context: FilesSourceRuntimeContext[OSFFileSourceConfiguration]
    ):
        resolved_path = self._resolve_path(source_path, context)
        if resolved_path.node_id is None or resolved_path.provider is None:
            raise MessageException("OSF downloads require a file path.")
        entry = self._get_entry_by_materialized_path(
            resolved_path.node_id,
            resolved_path.provider,
            resolved_path.materialized_path,
            context,
            expected_kind="file",
        )
        download_url = entry["links"].get("download")
        if not download_url:
            raise MessageException(f"OSF file '{source_path}' does not expose a download URL.")
        headers = self._get_request_headers(context)
        try:
            req = urllib.request.Request(download_url, headers=headers)
            with urllib.request.urlopen(req, timeout=DEFAULT_SOCKET_TIMEOUT) as page:
                output = open(native_path, "wb")
                return stream_to_open_named_file(
                    page, output.fileno(), native_path, source_encoding=get_charset_from_http_headers(page.headers)
                )
        except HTTPError as exc:
            if exc.code in {401, 403} and not context.config.token:
                self._raise_auth_required()
            raise MessageException(f"Could not download OSF file at '{source_path}'.") from exc

    def _write_from(
        self, target_path: str, native_path: str, context: FilesSourceRuntimeContext[OSFFileSourceConfiguration]
    ) -> Optional[str]:
        resolved_path = self._resolve_path(target_path, context)
        self._ensure_writable_container_target(resolved_path, action="upload a file")
        if resolved_path.materialized_path in {"", "/"}:
            raise RequestParameterInvalidException(
                "OSF uploads require a filename inside a storage provider, "
                f"for example '{self._write_target_example(resolved_path.node_id, resolved_path.provider)}'."
            )

        self._ensure_node_writable(resolved_path.node_id, context)
        filename = posixpath.basename(resolved_path.materialized_path.rstrip("/"))
        parent_path = posixpath.dirname(resolved_path.materialized_path.rstrip("/")) or "/"

        try:
            existing_entry = self._get_entry_by_materialized_path(
                resolved_path.node_id,
                resolved_path.provider,
                resolved_path.materialized_path,
                context,
            )
        except ObjectNotFound:
            existing_entry = None

        if existing_entry:
            if existing_entry["attributes"].get("kind") != "file":
                raise MessageException(f"OSF destination '{target_path}' is not a file.")
            upload_url = existing_entry["links"].get("upload")
            upload_params = {"kind": "file"}
        else:
            parent_entry = self._ensure_folder_path(
                resolved_path.node_id,
                resolved_path.provider,
                parent_path,
                context,
            )
            upload_url = parent_entry["links"].get("upload")
            upload_params = {"kind": "file", "name": filename}

        if not upload_url:
            raise MessageException(f"OSF destination '{target_path}' does not allow uploads.")

        with open(native_path, "rb") as input_file:
            self._request(
                "PUT",
                upload_url,
                context,
                params=upload_params,
                data=input_file,
                expected_status_codes={200, 201},
                auth_required=True,
            )
        return self.uri_from_path(
            self._entry_materialized_path_to_plugin_path(
                resolved_path.node_id, resolved_path.provider, resolved_path.materialized_path
            )
        )

    def _list_nodes(
        self,
        context: FilesSourceRuntimeContext[OSFFileSourceConfiguration],
        write_intent: bool = False,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        query: Optional[str] = None,
    ) -> tuple[list[AnyRemoteEntry], int]:
        if write_intent:
            params: dict[str, Any] = {}
            if query:
                params["filter[title]"] = query
            nodes = self._get_all_entries(
                context,
                self._user_nodes_url(context),
                params=params,
                auth_required=True,
                page_size=DEFAULT_NODE_PAGE_SIZE,
            )
            writable_nodes = [node for node in nodes if self._node_has_write_access(node)]
            total = len(writable_nodes)
            writable_nodes = self._slice_items(writable_nodes, limit, offset)
            return [self._node_to_remote_directory(node) for node in writable_nodes], total

        request_url = self._user_nodes_url(context) if context.config.token else self._nodes_url(context)
        params: dict[str, Any] = {}
        if query:
            params["filter[title]"] = query
        nodes, total = self._get_entries_window(context, request_url, params=params, limit=limit, offset=offset)
        return [self._node_to_remote_directory(node) for node in nodes], total

    def _list_node_providers(
        self,
        context: FilesSourceRuntimeContext[OSFFileSourceConfiguration],
        node_id: str,
        write_intent: bool = False,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        query: Optional[str] = None,
    ) -> tuple[list[AnyRemoteEntry], int]:
        if write_intent:
            self._ensure_node_writable(node_id, context)
        node_url = self._node_url(context, node_id).rstrip("/")
        response = self._get_response(context, f"{node_url}/files/")
        providers = response["data"]
        if write_intent:
            providers = [provider for provider in providers if provider.get("links", {}).get("upload")]
        if query:
            query_lower = query.lower()
            providers = [provider for provider in providers if query_lower in provider["attributes"].get("name", "").lower()]
        total = len(providers)
        providers = self._slice_items(providers, limit, offset)
        return [self._provider_to_remote_directory(node_id, provider) for provider in providers], total

    def _list_provider_path(
        self,
        context: FilesSourceRuntimeContext[OSFFileSourceConfiguration],
        node_id: str,
        provider: str,
        materialized_path: str,
        recursive: bool,
        write_intent: bool,
        limit: Optional[int],
        offset: Optional[int],
        query: Optional[str],
    ) -> tuple[list[AnyRemoteEntry], int]:
        if write_intent:
            self._ensure_node_writable(node_id, context)
        folder_entry = self._get_entry_by_materialized_path(
            node_id,
            provider,
            materialized_path,
            context,
            expected_kind="folder",
        )
        if recursive:
            entries = self._collect_entries_recursively(node_id, provider, folder_entry, context, query)
            total = len(entries)
            return self._slice_items(entries, limit, offset), total

        params: dict[str, Any] = {}
        if query:
            params["filter[name]"] = query
        api_entries, total = self._get_entries_window(
            context,
            self._children_url(folder_entry),
            params=params,
            limit=limit,
            offset=offset,
        )
        entries = [self._api_entry_to_remote_entry(node_id, provider, entry) for entry in api_entries]
        return entries, total

    def _collect_entries_recursively(
        self,
        node_id: str,
        provider: str,
        folder_entry: dict[str, Any],
        context: FilesSourceRuntimeContext[OSFFileSourceConfiguration],
        query: Optional[str] = None,
    ) -> list[AnyRemoteEntry]:
        api_entries = self._get_all_entries(context, self._children_url(folder_entry))
        query_lower = query.lower() if query else None
        entries: list[AnyRemoteEntry] = []
        for entry in api_entries:
            remote_entry = self._api_entry_to_remote_entry(node_id, provider, entry)
            if query_lower is None or query_lower in remote_entry.name.lower():
                entries.append(remote_entry)
            if entry["attributes"].get("kind") == "folder":
                entries.extend(self._collect_entries_recursively(node_id, provider, entry, context, query=query))
        return entries

    def _node_to_remote_directory(self, node: dict[str, Any]) -> RemoteDirectory:
        node_id = node["id"]
        path = f"/{node_id}"
        return RemoteDirectory(
            name=node["attributes"].get("title") or node_id,
            path=path,
            uri=self.uri_from_path(path),
        )

    def _provider_to_remote_directory(self, node_id: str, provider: dict[str, Any]) -> RemoteDirectory:
        provider_name = provider["attributes"].get("provider") or provider["attributes"].get("name")
        path = f"/{node_id}/{provider_name}"
        return RemoteDirectory(
            name=provider["attributes"].get("name") or provider_name,
            path=path,
            uri=self.uri_from_path(path),
        )

    def _api_entry_to_remote_entry(self, node_id: str, provider: str, entry: dict[str, Any]) -> AnyRemoteEntry:
        kind = entry["attributes"].get("kind")
        path = self._entry_to_path(node_id, provider, entry)
        uri = self.uri_from_path(path)
        if kind == "folder":
            return RemoteDirectory(name=entry["attributes"].get("name") or path.rsplit("/", 1)[-1], path=path, uri=uri)

        hashes = self._hashes_from_entry(entry)
        ctime = (
            entry["attributes"].get("date_created")
            or entry["attributes"].get("date_modified")
            or entry["attributes"].get("last_touched")
        )
        return RemoteFile(
            name=entry["attributes"].get("name") or path.rsplit("/", 1)[-1],
            path=path,
            uri=uri,
            size=entry["attributes"].get("size") or 0,
            ctime=ctime,
            hashes=hashes,
        )

    def _hashes_from_entry(self, entry: dict[str, Any]) -> Optional[list[RemoteFileHash]]:
        hashes = entry.get("attributes", {}).get("extra", {}).get("hashes", {})
        rval: list[RemoteFileHash] = []
        hash_name_map = {
            "md5": "MD5",
            "sha256": "SHA-256",
        }
        for hash_name, galaxy_hash_name in hash_name_map.items():
            hash_value = hashes.get(hash_name)
            if hash_value:
                rval.append(RemoteFileHash(hash_function=galaxy_hash_name, hash_value=hash_value))
        return rval or None

    def _entry_to_path(self, node_id: str, provider: str, entry: dict[str, Any]) -> str:
        materialized_path = entry["attributes"].get("materialized_path") or "/"
        return self._entry_materialized_path_to_plugin_path(
            node_id, provider, materialized_path, entry["attributes"].get("kind")
        )

    def _entry_materialized_path_to_plugin_path(
        self, node_id: str, provider: str, materialized_path: str, kind: Optional[str] = None
    ) -> str:
        materialized_path = materialized_path or "/"
        if materialized_path == "/":
            return f"/{node_id}/{provider}"
        suffix = materialized_path.rstrip("/") if kind == "folder" or materialized_path.endswith("/") else materialized_path
        return f"/{node_id}/{provider}{suffix}"

    def _resolve_path(
        self, path: str, context: FilesSourceRuntimeContext[OSFFileSourceConfiguration]
    ) -> OSFPath:
        parsed_path = self._parse_path(path)
        node_id = parsed_path.node_id or context.config.node_id
        provider = parsed_path.provider or context.config.provider
        materialized_path = parsed_path.materialized_path

        if context.config.node_id and node_id and node_id != context.config.node_id:
            raise MessageException(f"OSF path '{path}' is outside the configured node scope.")
        if context.config.provider and provider and provider != context.config.provider:
            raise MessageException(f"OSF path '{path}' is outside the configured provider scope.")
        if context.config.provider and not context.config.node_id:
            raise ConfigurationError("The OSF file source requires 'node_id' when 'provider' is configured.")
        return OSFPath(node_id=node_id, provider=provider, materialized_path=materialized_path)

    def _parse_path(self, path: str) -> OSFPath:
        if not path.startswith("/"):
            raise RequestParameterInvalidException(f"Invalid OSF path [{path}]. Paths must start with '/'.")
        stripped = path.strip("/")
        if not stripped:
            return OSFPath(node_id=None, provider=None, materialized_path="/")
        parts = [part for part in stripped.split("/") if part]
        node_id = parts[0]
        provider = parts[1] if len(parts) >= 2 else None
        remainder = parts[2:] if len(parts) >= 3 else []
        materialized_path = "/" + "/".join(remainder) if remainder else "/"
        return OSFPath(node_id=node_id, provider=provider, materialized_path=materialized_path)

    def _get_entry_by_materialized_path(
        self,
        node_id: str,
        provider: str,
        materialized_path: str,
        context: FilesSourceRuntimeContext[OSFFileSourceConfiguration],
        expected_kind: Optional[str] = None,
    ) -> dict[str, Any]:
        return self._traverse_materialized_path(
            node_id,
            provider,
            materialized_path,
            context,
            expected_kind=expected_kind,
        )

    def _get_provider_root(
        self,
        node_id: str,
        provider: str,
        context: FilesSourceRuntimeContext[OSFFileSourceConfiguration],
    ) -> dict[str, Any]:
        node_url = self._node_url(context, node_id).rstrip("/")
        response = self._get_response(context, f"{node_url}/files/providers/{quote(provider, safe='')}/")
        return response["data"]

    def _get_child_entry(
        self,
        parent_entry: dict[str, Any],
        child_name: str,
        context: FilesSourceRuntimeContext[OSFFileSourceConfiguration],
        expected_kind: Optional[str] = None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"filter[name]": child_name}
        if expected_kind:
            params["filter[kind]"] = expected_kind
        response = self._get_response(context, self._children_url(parent_entry), params=params)
        entries = response["data"]
        for entry in entries:
            if entry["attributes"].get("name") == child_name:
                return entry
        raise ObjectNotFound(f"Could not find OSF entry named '{child_name}'.")

    def _children_url(self, entry: dict[str, Any]) -> str:
        if files_link := entry.get("relationships", {}).get("files", {}).get("links", {}).get("related", {}).get("href"):
            return files_link
        raise MessageException("OSF folder entry does not expose a children listing URL.")

    def _ensure_writable_container_target(self, resolved_path: OSFPath, action: str) -> None:
        if resolved_path.node_id is None:
            raise MessageException(
                f"Cannot {action} at the OSF root. The root only lists OSF projects. "
                "Select a project and storage provider first."
            )
        if resolved_path.provider is None:
            raise MessageException(
                f"Cannot {action} at OSF project '/{resolved_path.node_id}'. "
                "That level only lists storage providers. Select a storage provider first."
            )

    def _write_target_example(self, node_id: Optional[str], provider: Optional[str]) -> str:
        if node_id and provider:
            return f"/{node_id}/{provider}/result.txt"
        if node_id:
            return f"/{node_id}/osfstorage/result.txt"
        return "/<node_id>/osfstorage/result.txt"

    def _entry_has_children_listing(self, entry: dict[str, Any]) -> bool:
        return bool(entry.get("relationships", {}).get("files", {}).get("links", {}).get("related", {}).get("href"))

    def _ensure_folder_path(
        self,
        node_id: str,
        provider: str,
        materialized_path: str,
        context: FilesSourceRuntimeContext[OSFFileSourceConfiguration],
    ) -> dict[str, Any]:
        return self._traverse_materialized_path(
            node_id,
            provider,
            materialized_path,
            context,
            expected_kind="folder",
            create_missing_folders=True,
        )

    def _create_child_folder(
        self,
        parent_entry: dict[str, Any],
        folder_name: str,
        context: FilesSourceRuntimeContext[OSFFileSourceConfiguration],
    ) -> dict[str, Any]:
        new_folder_url = parent_entry["links"].get("new_folder")
        if not new_folder_url:
            raise MessageException("The selected OSF location does not allow folder creation.")
        response = self._request(
            "PUT",
            new_folder_url,
            context,
            params={"name": folder_name},
            expected_status_codes={201},
            auth_required=True,
        )
        try:
            payload = response.json()
        except Exception:
            payload = {}
        created_entry = payload.get("data") if isinstance(payload, dict) else None
        if isinstance(created_entry, dict):
            return created_entry
        if self._entry_has_children_listing(parent_entry):
            return self._get_child_entry(parent_entry, folder_name, context, expected_kind="folder")
        raise MessageException("OSF folder creation did not return enough information to continue creating nested folders.")

    def _get_all_entries(
        self,
        context: FilesSourceRuntimeContext[OSFFileSourceConfiguration],
        request_url: str,
        params: Optional[dict[str, Any]] = None,
        auth_required: bool = False,
        page_size: Optional[int] = None,
    ) -> list[dict[str, Any]]:
        request_params = dict(params or {})
        if page_size is not None:
            request_params.setdefault("page[size]", page_size)
            request_params.setdefault("page", 1)
        entries: list[dict[str, Any]] = []
        for response in self._iter_paginated_responses(
            context,
            request_url,
            params=request_params,
            auth_required=auth_required,
        ):
            entries.extend(response["data"])
        return entries

    def _get_entries_window(
        self,
        context: FilesSourceRuntimeContext[OSFFileSourceConfiguration],
        request_url: str,
        params: Optional[dict[str, Any]] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        auth_required: bool = False,
    ) -> tuple[list[dict[str, Any]], int]:
        request_params = dict(params or {})
        if limit is None and offset is None:
            response = self._get_response(context, request_url, params=request_params, auth_required=auth_required)
            entries = response["data"]
            total = self._response_total(response, len(entries))
            return entries, total

        page_size = limit or DEFAULT_PAGE_LIMIT
        start_offset = offset or 0
        request_params.update({"page[size]": page_size, "page": start_offset // page_size + 1})
        response_iterator = self._iter_paginated_responses(
            context,
            request_url,
            params=request_params,
            auth_required=auth_required,
        )
        first_response = next(response_iterator)
        total = self._response_total(first_response, len(first_response["data"]))
        start_within_page = start_offset % page_size
        entries = list(first_response["data"][start_within_page:])

        for response in response_iterator:
            if limit is not None and len(entries) >= limit:
                break
            entries.extend(response["data"])

        if limit is not None:
            entries = entries[:limit]
        return entries, total

    def _iter_paginated_responses(
        self,
        context: FilesSourceRuntimeContext[OSFFileSourceConfiguration],
        request_url: str,
        params: Optional[dict[str, Any]] = None,
        auth_required: bool = False,
    ):
        next_url = request_url
        next_params = dict(params or {})
        while next_url:
            response = self._get_response(context, next_url, params=next_params, auth_required=auth_required)
            yield response
            next_url = response.get("links", {}).get("next")
            next_params = {}

    def _traverse_materialized_path(
        self,
        node_id: str,
        provider: str,
        materialized_path: str,
        context: FilesSourceRuntimeContext[OSFFileSourceConfiguration],
        expected_kind: Optional[str] = None,
        create_missing_folders: bool = False,
    ) -> dict[str, Any]:
        current_entry = self._get_provider_root(node_id, provider, context)
        normalized_path = self._normalize_materialized_path(materialized_path)
        if normalized_path == "/":
            if expected_kind and expected_kind != "folder":
                raise MessageException(f"OSF path '/{node_id}/{provider}' does not point to a {expected_kind}.")
            return current_entry

        parts = [part for part in normalized_path.strip("/").split("/") if part]
        for index, part in enumerate(parts):
            child_expected_kind = "folder" if create_missing_folders or index < len(parts) - 1 else None
            if create_missing_folders:
                if self._entry_has_children_listing(current_entry):
                    try:
                        current_entry = self._get_child_entry(
                            current_entry,
                            part,
                            context,
                            expected_kind=child_expected_kind,
                        )
                        continue
                    except ObjectNotFound:
                        pass
                current_entry = self._create_child_folder(current_entry, part, context)
            else:
                current_entry = self._get_child_entry(
                    current_entry,
                    part,
                    context,
                    expected_kind=child_expected_kind,
                )

        actual_kind = current_entry["attributes"].get("kind")
        if expected_kind and actual_kind != expected_kind:
            plugin_path = self._entry_to_path(node_id, provider, current_entry)
            raise MessageException(f"OSF path '{plugin_path}' does not point to a {expected_kind}.")
        return current_entry

    def _ensure_node_writable(self, node_id: str, context: FilesSourceRuntimeContext[OSFFileSourceConfiguration]) -> None:
        node_response = self._get_response(context, self._node_url(context, node_id), auth_required=True)
        if not self._node_has_write_access(node_response["data"]):
            raise MessageException(f"You do not have write access to the OSF node '{node_id}'.")

    def _node_has_write_access(self, node: dict[str, Any]) -> bool:
        permissions = set(node.get("attributes", {}).get("current_user_permissions", []))
        return "write" in permissions or "admin" in permissions

    def _get_response(
        self,
        context: FilesSourceRuntimeContext[OSFFileSourceConfiguration],
        request_url: str,
        params: Optional[dict[str, Any]] = None,
        auth_required: bool = False,
    ) -> dict[str, Any]:
        response = self._request(
            "GET",
            request_url,
            context,
            params=params,
            expected_status_codes={200},
            auth_required=auth_required,
        )
        return response.json()

    def _request(
        self,
        method: str,
        request_url: str,
        context: FilesSourceRuntimeContext[OSFFileSourceConfiguration],
        params: Optional[dict[str, Any]] = None,
        expected_status_codes: Optional[set[int]] = None,
        auth_required: bool = False,
        **kwargs,
    ):
        headers = kwargs.pop("headers", {})
        headers.update(self._get_request_headers(context, auth_required=auth_required))
        request_method = getattr(requests, method.lower())
        response = request_method(request_url, params=params, headers=headers, **kwargs)
        self._ensure_response_status(response, expected_status_codes or {200}, context)
        return response

    def _get_request_headers(
        self, context: FilesSourceRuntimeContext[OSFFileSourceConfiguration], auth_required: bool = False
    ) -> dict[str, str]:
        token = context.config.token.strip() if context.config.token else None
        if auth_required and not token:
            self._raise_auth_required()
        return {"Authorization": f"Bearer {token}"} if token else {}

    def _ensure_response_status(
        self,
        response,
        expected_status_codes: set[int],
        context: FilesSourceRuntimeContext[OSFFileSourceConfiguration],
    ) -> None:
        if response.status_code in expected_status_codes:
            return
        if response.status_code in {401, 403} and not context.config.token:
            self._raise_auth_required()
        if response.status_code == 401 and context.config.token:
            detail = self._response_error_message(response)
            raise MessageException(
                "OSF rejected the provided personal access token. "
                "Check that the token is valid, copied without extra whitespace, and belongs to this OSF server. "
                f"OSF reported: {detail}"
            )
        if response.status_code == 403 and context.config.token:
            detail = self._response_error_message(response)
            raise MessageException(
                "OSF denied this request for the provided personal access token. "
                "Check that the token has the required OSF scope "
                "(`osf.full_read` for browsing, `osf.full_write` for uploads) and that you can access this node. "
                f"OSF reported: {detail}"
            )
        if response.status_code == 404:
            raise ObjectNotFound(f"Request to {response.url} returned 404.")
        raise MessageException(
            f"Request to {response.url} failed with status code {response.status_code}: {self._response_error_message(response)}"
        )

    def _response_error_message(self, response) -> str:
        try:
            payload = response.json()
        except Exception:
            return response.text
        errors = payload.get("errors") or []
        if errors:
            details = [error.get("detail") for error in errors if error.get("detail")]
            if details:
                return "; ".join(details)
        return payload.get("message") or response.text

    def _response_total(self, response_data: dict[str, Any], default: int) -> int:
        return response_data.get("links", {}).get("meta", {}).get("total", default)

    def _raise_auth_required(self) -> None:
        raise AuthenticationRequired(f"Please provide an OSF personal access token for '{self.label}'.")

    def _slice_items(self, items: list[Any], limit: Optional[int], offset: Optional[int]) -> list[Any]:
        start = offset or 0
        end = start + limit if limit is not None else None
        return items[start:end]

    def _normalize_materialized_path(self, materialized_path: str) -> str:
        if not materialized_path or materialized_path == "/":
            return "/"
        normalized = materialized_path if materialized_path.startswith("/") else f"/{materialized_path}"
        return normalized.rstrip("/") or "/"

    def _api_base_url(self, context: FilesSourceRuntimeContext[OSFFileSourceConfiguration]) -> str:
        return self._api_base_url_from_url(context.config.url)

    def _api_base_url_from_url(self, url: Optional[str]) -> str:
        scheme, netloc = self._normalized_url_parts(url)
        if not netloc:
            return DEFAULT_OSF_API_URL

        if netloc.startswith("api."):
            return f"{scheme}://{netloc}/v2"

        return f"{scheme}://api.{netloc}/v2"

    def _repository_base_url(self, url: Optional[str]) -> str:
        scheme, netloc = self._normalized_url_parts(url)
        if not netloc:
            return DEFAULT_OSF_REPOSITORY_URL
        if netloc.startswith("api."):
            netloc = netloc[4:]
        return f"{scheme}://{netloc}"

    def _normalized_url_parts(self, url: Optional[str]) -> tuple[str, str]:
        raw_url = (url or DEFAULT_OSF_REPOSITORY_URL).strip()
        if "://" not in raw_url:
            raw_url = f"https://{raw_url}"
        parsed = urlparse(raw_url)
        return parsed.scheme or "https", parsed.netloc

    def _nodes_url(self, context: FilesSourceRuntimeContext[OSFFileSourceConfiguration]) -> str:
        return f"{self._api_base_url(context)}/nodes/"

    def _user_nodes_url(self, context: FilesSourceRuntimeContext[OSFFileSourceConfiguration]) -> str:
        return f"{self._api_base_url(context)}/users/me/nodes/"

    def _node_url(self, context: FilesSourceRuntimeContext[OSFFileSourceConfiguration], node_id: str) -> str:
        return f"{self._api_base_url(context)}/nodes/{quote(node_id, safe='')}/"


__all__ = ("OSFFilesSource",)
