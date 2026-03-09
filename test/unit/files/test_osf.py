import io
import json
import os
import posixpath
import re
import urllib.request
from tempfile import NamedTemporaryFile
from typing import (
    Any,
    Optional,
)
from unittest import mock
from urllib.parse import (
    parse_qs,
    urlparse,
)

import pytest
import responses

from galaxy.exceptions import (
    AuthenticationRequired,
    MessageException,
)
from galaxy.files.models import FilesSourceOptions
from galaxy.schema.remote_files import CreateEntryPayload
from ._util import configured_file_sources

REPOSITORY_ROOT = "https://osf.io"
API_ROOT = "https://api.osf.io/v2"
ROOT_URI = "osf://test1"


def _plugin_config(**overrides) -> dict[str, Any]:
    plugin = {
        "type": "osf",
        "id": "test1",
        "label": "OSF Test Source",
        "url": REPOSITORY_ROOT,
        "writable": overrides.pop("writable", False),
    }
    plugin.update(overrides)
    return plugin


def _file_source(**overrides):
    file_sources = configured_file_sources([_plugin_config(**overrides)])
    return file_sources.get_file_source_path(ROOT_URI).file_source


def _list_response(data: list[dict[str, Any]], total: Optional[int] = None, next_url: Optional[str] = None) -> dict[str, Any]:
    per_page = len(data) or 10
    return {
        "data": data,
        "links": {
            "first": None,
            "last": None,
            "prev": None,
            "next": next_url,
            "meta": {
                "total": total if total is not None else len(data),
                "per_page": per_page,
            },
        },
        "meta": {"version": "2.0"},
    }


def _node(node_id: str, title: str, permissions: Optional[list[str]] = None) -> dict[str, Any]:
    return {
        "id": node_id,
        "type": "nodes",
        "attributes": {
            "title": title,
            "public": True,
            "current_user_permissions": permissions or ["read"],
        },
        "links": {
            "self": f"{API_ROOT}/nodes/{node_id}/",
            "html": f"https://osf.io/{node_id}/",
        },
    }


def _provider(node_id: str, provider_name: str = "osfstorage", root_folder_id: str = "root-folder") -> dict[str, Any]:
    return {
        "id": f"{node_id}:{provider_name}",
        "type": "files",
        "attributes": {
            "kind": "folder",
            "name": provider_name,
            "path": "/",
            "node": node_id,
            "provider": provider_name,
        },
        "relationships": {
            "files": {
                "links": {
                    "related": {
                        "href": f"{API_ROOT}/nodes/{node_id}/files/{provider_name}/",
                        "meta": {},
                    }
                }
            },
            "root_folder": {
                "links": {"related": {"href": f"{API_ROOT}/files/{root_folder_id}/", "meta": {}}},
                "data": {"id": root_folder_id, "type": "files"},
            },
            "target": {
                "links": {"related": {"href": f"{API_ROOT}/nodes/{node_id}/", "meta": {"type": "nodes"}}},
                "data": {"type": "nodes", "id": node_id},
            },
        },
        "links": {
            "upload": f"https://files.osf.io/v1/resources/{node_id}/providers/{provider_name}/",
            "new_folder": f"https://files.osf.io/v1/resources/{node_id}/providers/{provider_name}/?kind=folder",
            "self": f"{API_ROOT}/nodes/{node_id}/files/providers/{provider_name}/",
        },
    }


def _folder(node_id: str, provider_name: str, folder_id: str, name: str, materialized_path: str) -> dict[str, Any]:
    return {
        "id": folder_id,
        "type": "files",
        "attributes": {
            "name": name,
            "kind": "folder",
            "path": f"/{folder_id}/",
            "provider": provider_name,
            "materialized_path": materialized_path,
            "extra": {"hashes": {"md5": None, "sha256": None}},
        },
        "relationships": {
            "files": {
                "links": {
                    "related": {
                        "href": f"{API_ROOT}/nodes/{node_id}/files/{provider_name}/{folder_id}/",
                        "meta": {},
                    }
                }
            }
        },
        "links": {
            "upload": f"https://files.osf.io/v1/resources/{node_id}/providers/{provider_name}/{folder_id}/",
            "new_folder": f"https://files.osf.io/v1/resources/{node_id}/providers/{provider_name}/{folder_id}/?kind=folder",
            "self": f"{API_ROOT}/files/{folder_id}/",
        },
    }


def _folder_create_response(
    node_id: str,
    provider_name: str,
    folder_id: str,
    materialized_path: str,
    response_id: Optional[str] = None,
) -> dict[str, Any]:
    return {
        "id": response_id or folder_id,
        "attributes": {
            "kind": "folder",
            "name": posixpath.basename(materialized_path.rstrip("/")),
            "path": materialized_path,
        },
        "links": {
            "upload": f"https://files.osf.io/v1/resources/{node_id}/providers/{provider_name}/{folder_id}/",
            "new_folder": f"https://files.osf.io/v1/resources/{node_id}/providers/{provider_name}/{folder_id}/?kind=folder",
            "delete": f"https://files.osf.io/v1/resources/{node_id}/providers/{provider_name}/{folder_id}/",
        },
    }


def _file(
    node_id: str,
    provider_name: str,
    file_id: str,
    name: str,
    materialized_path: str,
    download_url: Optional[str] = None,
) -> dict[str, Any]:
    return {
        "id": file_id,
        "type": "files",
        "attributes": {
            "name": name,
            "kind": "file",
            "path": f"/{file_id}",
            "size": 12,
            "provider": provider_name,
            "materialized_path": materialized_path,
            "date_created": "2024-01-01T00:00:00Z",
            "extra": {"hashes": {"md5": "abc123", "sha256": "def456"}},
        },
        "relationships": {},
        "links": {
            "download": download_url or f"https://files.osf.io/v1/resources/{node_id}/providers/{provider_name}/{file_id}/",
            "upload": f"https://files.osf.io/v1/resources/{node_id}/providers/{provider_name}/{file_id}/",
            "self": f"{API_ROOT}/files/{file_id}/",
        },
    }


class _BinaryResponse(io.BytesIO):
    def __init__(self, content: bytes):
        super().__init__(content)
        self.headers = {}

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        self.close()
        return False


@responses.activate
def test_root_listing_uses_osf_node_pagination_and_search():
    file_source = _file_source()

    def list_nodes_callback(request):
        query = parse_qs(urlparse(request.url).query)
        assert query["page[size]"] == ["5"]
        assert query["page"] == ["2"]
        assert query["filter[title]"] == ["Genome"]
        return (200, {}, json.dumps(_list_response([_node("abc12", "Genome Project")], total=11)))

    responses.add_callback(
        responses.GET,
        f"{API_ROOT}/nodes/",
        callback=list_nodes_callback,
        content_type="application/json",
    )

    entries, total = file_source.list("/", limit=5, offset=5, query="Genome")

    assert total == 11
    assert len(entries) == 1
    assert entries[0].name == "Genome Project"
    assert entries[0].path == "/abc12"
    assert entries[0].uri == f"{ROOT_URI}/abc12"


@responses.activate
def test_root_listing_handles_non_aligned_offset_across_pages():
    file_source = _file_source()

    def list_nodes_callback(request):
        query = parse_qs(urlparse(request.url).query)
        page = query["page"][0]
        assert query["page[size]"] == ["25"]
        if page == "1":
            payload = _list_response(
                [_node(f"node{i:02d}", f"Project {i:02d}") for i in range(25)],
                total=40,
                next_url=f"{API_ROOT}/nodes/?page%5Bsize%5D=25&page=2",
            )
        elif page == "2":
            payload = _list_response([_node(f"node{i:02d}", f"Project {i:02d}") for i in range(25, 40)], total=40)
        else:
            raise AssertionError(f"Unexpected page for node listing: {page}")
        return (200, {}, json.dumps(payload))

    responses.add_callback(
        responses.GET,
        f"{API_ROOT}/nodes/",
        callback=list_nodes_callback,
        content_type="application/json",
    )

    entries, total = file_source.list("/", limit=25, offset=10)

    assert total == 40
    assert [entry.path for entry in entries] == [f"/node{i:02d}" for i in range(10, 35)]


@responses.activate
def test_api_url_is_accepted():
    file_source = _file_source(url=API_ROOT)
    responses.add(
        responses.GET,
        f"{API_ROOT}/nodes/",
        json=_list_response([_node("abc12", "Genome Project")], total=1),
        status=200,
    )

    entries, total = file_source.list("/")

    assert total == 1
    assert entries[0].path == "/abc12"
    assert file_source.get_url() == REPOSITORY_ROOT


def test_write_intent_requires_token():
    file_source = _file_source(writable=True)

    with pytest.raises(AuthenticationRequired):
        file_source.list("/", opts=FilesSourceOptions(write_intent=True))


def test_create_folder_at_root_has_clear_error():
    file_source = _file_source(writable=True, token="secret-token")

    with pytest.raises(MessageException, match="Cannot create a folder at the OSF root"):
        file_source.create_entry(CreateEntryPayload(target=ROOT_URI, name="exports"))


def test_upload_to_project_level_has_clear_error():
    file_source = _file_source(writable=True, token="secret-token")

    with NamedTemporaryFile(mode="wb", delete=False) as temp:
        temp.write(b"upload payload")
        temp.flush()
        temp_path = temp.name

    try:
        with pytest.raises(MessageException, match="That level only lists storage providers"):
            file_source.write_from("/node01", temp_path)
    finally:
        os.unlink(temp_path)


def test_upload_to_provider_root_requires_filename():
    file_source = _file_source(writable=True, token="secret-token")

    with NamedTemporaryFile(mode="wb", delete=False) as temp:
        temp.write(b"upload payload")
        temp.flush()
        temp_path = temp.name

    try:
        with pytest.raises(MessageException, match="/node01/osfstorage/result.txt"):
            file_source.write_from("/node01/osfstorage", temp_path)
    finally:
        os.unlink(temp_path)


@responses.activate
def test_write_intent_filters_to_writable_nodes():
    file_source = _file_source(writable=True, token="secret-token")

    def user_nodes_callback(request):
        assert request.headers["Authorization"] == "Bearer secret-token"
        query = parse_qs(urlparse(request.url).query)
        assert query["page[size]"] == ["100"]
        assert query["page"] == ["1"]
        payload = _list_response(
            [
                _node("read01", "Read Only", permissions=["read"]),
                _node("write01", "Writable", permissions=["read", "write"]),
            ],
            total=2,
        )
        return (200, {}, json.dumps(payload))

    responses.add_callback(
        responses.GET,
        f"{API_ROOT}/users/me/nodes/",
        callback=user_nodes_callback,
        content_type="application/json",
    )

    entries, total = file_source.list("/", opts=FilesSourceOptions(write_intent=True))

    assert total == 1
    assert [entry.name for entry in entries] == ["Writable"]
    assert entries[0].path == "/write01"


@responses.activate
def test_invalid_token_error_is_explicit():
    file_source = _file_source(token="bad-token")
    responses.add(
        responses.GET,
        f"{API_ROOT}/users/me/nodes/",
        json={"errors": [{"detail": "User provided an invalid OAuth2 access token"}]},
        status=401,
    )

    with pytest.raises(MessageException, match="OSF rejected the provided personal access token"):
        file_source.list("/")


@responses.activate
def test_forbidden_token_error_mentions_scope():
    file_source = _file_source(token="read-only-token")
    responses.add(
        responses.GET,
        f"{API_ROOT}/users/me/nodes/",
        json={"errors": [{"detail": "You do not have permission to perform this action"}]},
        status=403,
    )

    with pytest.raises(MessageException, match="osf.full_read"):
        file_source.list("/")


@responses.activate
def test_scoped_recursive_listing_and_download():
    file_source = _file_source(node_id="node01", provider="osfstorage", token="secret-token")
    provider_entry = _provider("node01")
    folder_entry = _folder("node01", "osfstorage", "folder01", "subdir", "/subdir/")
    root_file = _file("node01", "osfstorage", "file01", "root.txt", "/root.txt")
    nested_file = _file("node01", "osfstorage", "file02", "nested.txt", "/subdir/nested.txt")

    responses.add(
        responses.GET,
        f"{API_ROOT}/nodes/node01/files/providers/osfstorage/",
        json={"data": provider_entry, "meta": {"version": "2.0"}},
        status=200,
    )

    def root_children_callback(request):
        query = parse_qs(urlparse(request.url).query)
        if not query:
            payload = _list_response([folder_entry, root_file], total=2)
        elif query == {"filter[name]": ["root.txt"]}:
            payload = _list_response([root_file], total=1)
        elif query == {"filter[name]": ["subdir"], "filter[kind]": ["folder"]}:
            payload = _list_response([folder_entry], total=1)
        else:
            raise AssertionError(f"Unexpected query string for root children: {query}")
        return (200, {}, json.dumps(payload))

    responses.add_callback(
        responses.GET,
        re.compile(rf"{re.escape(API_ROOT)}/nodes/node01/files/osfstorage/?(?:\?.*)?$"),
        callback=root_children_callback,
        content_type="application/json",
    )
    responses.add(
        responses.GET,
        f"{API_ROOT}/nodes/node01/files/osfstorage/folder01/",
        json=_list_response([nested_file], total=1),
        status=200,
    )

    entries, total = file_source.list("/", recursive=True)

    assert total == 3
    assert [entry.path for entry in entries] == [
        "/node01/osfstorage/subdir",
        "/node01/osfstorage/subdir/nested.txt",
        "/node01/osfstorage/root.txt",
    ]

    def urlopen_mock(request, **kwargs):
        assert request.full_url == root_file["links"]["download"]
        assert request.headers["Authorization"] == "Bearer secret-token"
        return _BinaryResponse(b"root contents")

    with NamedTemporaryFile(delete=False) as output:
        output_path = output.name

    try:
        with mock.patch.object(urllib.request, "urlopen", new=urlopen_mock):
            file_source.realize_to("/node01/osfstorage/root.txt", output_path)
        with open(output_path, "rb") as handle:
            assert handle.read() == b"root contents"
    finally:
        os.unlink(output_path)


@responses.activate
def test_recursive_listing_follows_pagination_for_root_and_nested_folders():
    file_source = _file_source(node_id="node01", provider="osfstorage", token="secret-token")
    provider_entry = _provider("node01")
    folder_entry = _folder("node01", "osfstorage", "folder01", "subdir", "/subdir/")
    nested_file_one = _file("node01", "osfstorage", "file11", "nested-1.txt", "/subdir/nested-1.txt")
    nested_file_two = _file("node01", "osfstorage", "file12", "nested-2.txt", "/subdir/nested-2.txt")
    root_file_two = _file("node01", "osfstorage", "file02", "root-2.txt", "/root-2.txt")

    responses.add(
        responses.GET,
        f"{API_ROOT}/nodes/node01/files/providers/osfstorage/",
        json={"data": provider_entry, "meta": {"version": "2.0"}},
        status=200,
    )

    def root_children_callback(request):
        query = parse_qs(urlparse(request.url).query)
        if not query:
            payload = _list_response(
                [folder_entry],
                total=2,
                next_url=f"{API_ROOT}/nodes/node01/files/osfstorage/?page=2",
            )
        elif query == {"page": ["2"]}:
            payload = _list_response([root_file_two], total=2)
        else:
            raise AssertionError(f"Unexpected query string for root children: {query}")
        return (200, {}, json.dumps(payload))

    responses.add_callback(
        responses.GET,
        re.compile(rf"{re.escape(API_ROOT)}/nodes/node01/files/osfstorage/?(?:\?.*)?$"),
        callback=root_children_callback,
        content_type="application/json",
    )

    def nested_children_callback(request):
        query = parse_qs(urlparse(request.url).query)
        if not query:
            payload = _list_response(
                [nested_file_one],
                total=2,
                next_url=f"{API_ROOT}/nodes/node01/files/osfstorage/folder01/?page=2",
            )
        elif query == {"page": ["2"]}:
            payload = _list_response([nested_file_two], total=2)
        else:
            raise AssertionError(f"Unexpected query string for nested children: {query}")
        return (200, {}, json.dumps(payload))

    responses.add_callback(
        responses.GET,
        re.compile(rf"{re.escape(API_ROOT)}/nodes/node01/files/osfstorage/folder01/?(?:\?.*)?$"),
        callback=nested_children_callback,
        content_type="application/json",
    )

    entries, total = file_source.list("/", recursive=True)

    assert total == 4
    assert [entry.path for entry in entries] == [
        "/node01/osfstorage/subdir",
        "/node01/osfstorage/subdir/nested-1.txt",
        "/node01/osfstorage/subdir/nested-2.txt",
        "/node01/osfstorage/root-2.txt",
    ]


@responses.activate
def test_create_folder_and_upload_file():
    file_source = _file_source(writable=True, node_id="node01", provider="osfstorage", token="secret-token")
    provider_entry = _provider("node01")
    writable_node = _node("node01", "Writable Node", permissions=["read", "write"])

    responses.add(
        responses.GET,
        f"{API_ROOT}/nodes/node01/",
        json={"data": writable_node, "meta": {"version": "2.0"}},
        status=200,
    )
    responses.add(
        responses.GET,
        f"{API_ROOT}/nodes/node01/files/providers/osfstorage/",
        json={"data": provider_entry, "meta": {"version": "2.0"}},
        status=200,
    )

    def create_folder_or_upload_callback(request):
        query = parse_qs(urlparse(request.url).query)
        assert request.headers["Authorization"] == "Bearer secret-token"
        if query.get("kind") == ["folder"]:
            assert query["name"] == ["exports"]
            assert request.body in (None, b"")
        else:
            assert query == {"kind": ["file"], "name": ["result.txt"]}
            assert request.body == b"upload payload"
        return (201, {}, "{}")

    responses.add_callback(
        responses.PUT,
        "https://files.osf.io/v1/resources/node01/providers/osfstorage/",
        callback=create_folder_or_upload_callback,
        content_type="application/json",
    )

    created = file_source.create_entry(CreateEntryPayload(target=ROOT_URI, name="exports"))

    assert created.name == "exports"
    assert created.uri == f"{ROOT_URI}/node01/osfstorage/exports"

    def existing_file_lookup_callback(request):
        query = parse_qs(urlparse(request.url).query)
        assert query == {"filter[name]": ["result.txt"]}
        return (200, {}, json.dumps(_list_response([], total=0)))

    responses.add_callback(
        responses.GET,
        re.compile(rf"{re.escape(API_ROOT)}/nodes/node01/files/osfstorage/?(?:\?.*)?$"),
        callback=existing_file_lookup_callback,
        content_type="application/json",
    )

    with NamedTemporaryFile(mode="wb", delete=False) as temp:
        temp.write(b"upload payload")
        temp.flush()
        temp_path = temp.name

    try:
        actual_uri = file_source.write_from("/node01/osfstorage/result.txt", temp_path)
    finally:
        os.unlink(temp_path)

    assert actual_uri == f"{ROOT_URI}/node01/osfstorage/result.txt"


@responses.activate
def test_write_from_creates_missing_parent_folders():
    file_source = _file_source(writable=True, node_id="node01", provider="osfstorage", token="secret-token")
    provider_entry = _provider("node01")
    writable_node = _node("node01", "Writable Node", permissions=["read", "write"])
    foo_folder_create_response = _folder_create_response(
        "node01",
        "osfstorage",
        "folder-foo",
        "/foo/",
        response_id="osfstorage/69adf0289e20212661797439/",
    )
    bar_folder_create_response = _folder_create_response(
        "node01",
        "osfstorage",
        "folder-bar",
        "/foo/bar/",
        response_id="osfstorage/69adf0289e2021266179743a/",
    )

    responses.add(
        responses.GET,
        f"{API_ROOT}/nodes/node01/",
        json={"data": writable_node, "meta": {"version": "2.0"}},
        status=200,
    )
    responses.add(
        responses.GET,
        f"{API_ROOT}/nodes/node01/files/providers/osfstorage/",
        json={"data": provider_entry, "meta": {"version": "2.0"}},
        status=200,
    )
    def root_children_callback(request):
        query = parse_qs(urlparse(request.url).query)
        if not query:
            payload = _list_response([], total=0)
        elif query == {"filter[name]": ["foo"], "filter[kind]": ["folder"]}:
            payload = _list_response([], total=0)
        else:
            raise AssertionError(f"Unexpected query string for root children: {query}")
        return (200, {}, json.dumps(payload))

    responses.add_callback(
        responses.GET,
        re.compile(rf"{re.escape(API_ROOT)}/nodes/node01/files/osfstorage/?(?:\?.*)?$"),
        callback=root_children_callback,
        content_type="application/json",
    )
    responses.add(
        responses.PUT,
        "https://files.osf.io/v1/resources/node01/providers/osfstorage/",
        json={"data": foo_folder_create_response},
        status=201,
    )
    responses.add(
        responses.PUT,
        "https://files.osf.io/v1/resources/node01/providers/osfstorage/folder-foo/",
        json={"data": bar_folder_create_response},
        status=201,
    )

    def nested_upload_callback(request):
        query = parse_qs(urlparse(request.url).query)
        assert request.headers["Authorization"] == "Bearer secret-token"
        assert query == {"kind": ["file"], "name": ["result.txt"]}
        assert request.body == b"nested upload payload"
        return (201, {}, "{}")

    responses.add_callback(
        responses.PUT,
        "https://files.osf.io/v1/resources/node01/providers/osfstorage/folder-bar/",
        callback=nested_upload_callback,
        content_type="application/json",
    )

    with NamedTemporaryFile(mode="wb", delete=False) as temp:
        temp.write(b"nested upload payload")
        temp.flush()
        temp_path = temp.name

    try:
        actual_uri = file_source.write_from("/node01/osfstorage/foo/bar/result.txt", temp_path)
    finally:
        os.unlink(temp_path)

    assert actual_uri == f"{ROOT_URI}/node01/osfstorage/foo/bar/result.txt"
