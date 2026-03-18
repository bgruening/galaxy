import logging
from typing import (
    Any,
    Optional,
    Union,
)
from urllib.parse import urlsplit

from galaxy.files.models import (
    AnyRemoteEntry,
    FilesSourceRuntimeContext,
)
from galaxy.files.sources._fsspec import (
    CacheOptionsDictType,
    FsspecBaseFileSourceConfiguration,
    FsspecBaseFileSourceTemplateConfiguration,
    FsspecFilesSource,
)
from galaxy.util.config_templates import TemplateExpansion

try:
    from dcachefs import dCacheFileSystem as DCacheFileSystem
except ImportError:
    DCacheFileSystem = None


REQUIRED_PACKAGE = "dcachefs"
FS_PLUGIN_TYPE = "dcache"

log = logging.getLogger(__name__)


class DCacheFileSourceTemplateConfiguration(FsspecBaseFileSourceTemplateConfiguration):
    api_url: Union[str, TemplateExpansion]
    webdav_url: Union[str, TemplateExpansion]
    root_path: Union[str, TemplateExpansion, None] = None
    username: Union[str, TemplateExpansion, None] = None
    password: Union[str, TemplateExpansion, None] = None
    token: Union[str, TemplateExpansion, None] = None
    client_kwargs: Union[dict[str, Any], TemplateExpansion, None] = None
    request_kwargs: Union[dict[str, Any], TemplateExpansion, None] = None


class DCacheFileSourceConfiguration(FsspecBaseFileSourceConfiguration):
    api_url: str
    webdav_url: str
    root_path: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    token: Optional[str] = None
    client_kwargs: Optional[dict[str, Any]] = None
    request_kwargs: Optional[dict[str, Any]] = None


class DCacheFilesSource(
    FsspecFilesSource[DCacheFileSourceTemplateConfiguration, DCacheFileSourceConfiguration]
):
    plugin_type = FS_PLUGIN_TYPE
    required_module = DCacheFileSystem
    required_package = REQUIRED_PACKAGE

    template_config_class = DCacheFileSourceTemplateConfiguration
    resolved_config_class = DCacheFileSourceConfiguration

    def _open_fs(
        self,
        context: FilesSourceRuntimeContext[DCacheFileSourceConfiguration],
        cache_options: CacheOptionsDictType,
    ):
        if DCacheFileSystem is None:
            raise self.required_package_exception

        config = context.config
        return DCacheFileSystem(
            api_url=config.api_url,
            webdav_url=config.webdav_url,
            username=config.username,
            password=config.password,
            token=config.token,
            client_kwargs=config.client_kwargs,
            request_kwargs=config.request_kwargs,
            **cache_options,
        )

    def _normalize_path(self, path: str) -> str:
        if not path or path == "/":
            return "/"
        return f"/{path.lstrip('/')}"

    def _normalize_root_path(self, root_path: Optional[str]) -> str:
        if not root_path or root_path == "/":
            return ""
        return self._normalize_path(root_path).rstrip("/")

    def _relative_path_from_direct_url(self, url: str, webdav_url: str, root_path: Optional[str]) -> Optional[str]:
        parsed_url = urlsplit(url)
        if parsed_url.scheme not in {"http", "https"}:
            return None

        parsed_webdav = urlsplit(webdav_url)
        if (parsed_url.scheme, parsed_url.netloc) != (parsed_webdav.scheme, parsed_webdav.netloc):
            return None

        relative_path = self._normalize_path(parsed_url.path)
        webdav_base_path = self._normalize_root_path(parsed_webdav.path)
        if webdav_base_path:
            if relative_path == webdav_base_path:
                relative_path = "/"
            elif relative_path.startswith(f"{webdav_base_path}/"):
                relative_path = self._normalize_path(relative_path[len(webdav_base_path) :])
            else:
                return None

        normalized_root_path = self._normalize_root_path(root_path)
        if normalized_root_path:
            if relative_path == normalized_root_path:
                return "/"
            if relative_path.startswith(f"{normalized_root_path}/"):
                return self._normalize_path(relative_path[len(normalized_root_path) :])
            return None

        return relative_path

    def _to_dcache_path(self, path: str, config: DCacheFileSourceConfiguration) -> str:
        direct_relative_path = self._relative_path_from_direct_url(path, config.webdav_url, config.root_path)
        if direct_relative_path is not None:
            path = direct_relative_path
        elif path.startswith("dcache://"):
            path = self._normalize_path(path.removeprefix("dcache://"))
        else:
            path = self._normalize_path(path)

        normalized_root_path = self._normalize_root_path(config.root_path)
        if normalized_root_path:
            if path == "/":
                return normalized_root_path
            return f"{normalized_root_path}/{path.lstrip('/')}"
        return path

    def _adapt_entry_path(self, filesystem_path: str) -> str:
        normalized_path = self._normalize_path(filesystem_path)
        normalized_root_path = self._normalize_root_path(self.template_config.root_path)
        if normalized_root_path:
            if normalized_path == normalized_root_path:
                return "/"
            if normalized_path.startswith(f"{normalized_root_path}/"):
                return self._normalize_path(normalized_path[len(normalized_root_path) :])
        return normalized_path

    def _list(
        self,
        context: FilesSourceRuntimeContext[DCacheFileSourceConfiguration],
        path: str = "/",
        recursive: bool = False,
        write_intent: bool = False,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        query: Optional[str] = None,
        sort_by: Optional[str] = None,
    ) -> tuple[list[AnyRemoteEntry], int]:
        dcache_path = self._to_dcache_path(path, context.config)
        return super()._list(
            context=context,
            path=dcache_path,
            recursive=recursive,
            limit=limit,
            offset=offset,
            query=query,
            sort_by=sort_by,
        )

    def _realize_to(
        self, source_path: str, native_path: str, context: FilesSourceRuntimeContext[DCacheFileSourceConfiguration]
    ):
        dcache_path = self._to_dcache_path(source_path, context.config)
        super()._realize_to(source_path=dcache_path, native_path=native_path, context=context)

    def _write_from(
        self, target_path: str, native_path: str, context: FilesSourceRuntimeContext[DCacheFileSourceConfiguration]
    ):
        dcache_path = self._to_dcache_path(target_path, context.config)
        super()._write_from(target_path=dcache_path, native_path=native_path, context=context)

    def to_relative_path(self, url: str) -> str:
        direct_relative_path = self._relative_path_from_direct_url(
            url,
            self.template_config.webdav_url,
            self.template_config.root_path,
        )
        if direct_relative_path is not None:
            return direct_relative_path
        if url.startswith("dcache://"):
            return self._normalize_path(url.removeprefix("dcache://"))
        return super().to_relative_path(url)

    def score_url_match(self, url: str):
        direct_relative_path = self._relative_path_from_direct_url(
            url,
            self.template_config.webdav_url,
            self.template_config.root_path,
        )
        if direct_relative_path is not None:
            direct_url_root = self.template_config.webdav_url.rstrip("/")
            normalized_root_path = self._normalize_root_path(self.template_config.root_path)
            if normalized_root_path:
                direct_url_root = f"{direct_url_root}{normalized_root_path}"
            return len(direct_url_root)
        if url.startswith("dcache://"):
            return len("dcache://")
        return super().score_url_match(url)


__all__ = ("DCacheFilesSource",)
