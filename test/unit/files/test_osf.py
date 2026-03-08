import io
import json
import os
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

from galaxy.exceptions import AuthenticationRequired
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

    def waterbutler_put_callback(request):
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
        callback=waterbutler_put_callback,
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
