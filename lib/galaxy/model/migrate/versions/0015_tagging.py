"""
This migration script adds the tables necessary to support tagging of histories,
datasets, and history-dataset associations (user views of datasets).

If using mysql, this script will display the following error, which is corrected in the next
migration script:
history_dataset_association_tag_association table failed:  (OperationalError)
(1059, "Identifier name 'ix_history_dataset_association_tag_association_history_dataset_association_id'
is too long)
"""
from __future__ import print_function

import logging

from migrate import UniqueConstraint
from sqlalchemy import Column, ForeignKey, Integer, MetaData, Table

from galaxy.model.custom_types import TrimmedString
from galaxy.model.migrate.versions.util import create_table, drop_table

log = logging.getLogger(__name__)
metadata = MetaData()

# New tables to support tagging of histories, datasets, and history-dataset associations.
Tag_table = Table(
    "tag",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("type", Integer),
    Column("parent_id", Integer, ForeignKey("tag.id")),
    Column("name", TrimmedString(255)),
    UniqueConstraint("name"),
)

HistoryTagAssociation_table = Table(
    "history_tag_association",
    metadata,
    Column("history_id", Integer, ForeignKey("history.id"), index=True),
    Column("tag_id", Integer, ForeignKey("tag.id"), index=True),
    Column("user_tname", TrimmedString(255), index=True),
    Column("value", TrimmedString(255), index=True),
    Column("user_value", TrimmedString(255), index=True),
)

DatasetTagAssociation_table = Table(
    "dataset_tag_association",
    metadata,
    Column("dataset_id", Integer, ForeignKey("dataset.id"), index=True),
    Column("tag_id", Integer, ForeignKey("tag.id"), index=True),
    Column("user_tname", TrimmedString(255), index=True),
    Column("value", TrimmedString(255), index=True),
    Column("user_value", TrimmedString(255), index=True),
)

HistoryDatasetAssociationTagAssociation_table = Table(
    "history_dataset_association_tag_association",
    metadata,
    Column(
        "history_dataset_association_id",
        Integer,
        ForeignKey("history_dataset_association.id"),
        index=True,
    ),
    Column("tag_id", Integer, ForeignKey("tag.id"), index=True),
    Column("user_tname", TrimmedString(255), index=True),
    Column("value", TrimmedString(255), index=True),
    Column("user_value", TrimmedString(255), index=True),
)


def upgrade(migrate_engine):
    print(__doc__)
    metadata.bind = migrate_engine
    metadata.reflect()

    create_table(Tag_table)
    create_table(HistoryTagAssociation_table)
    create_table(DatasetTagAssociation_table)
    create_table(HistoryDatasetAssociationTagAssociation_table)


def downgrade(migrate_engine):
    metadata.bind = migrate_engine
    metadata.reflect()

    drop_table(HistoryDatasetAssociationTagAssociation_table)
    drop_table(DatasetTagAssociation_table)
    drop_table(HistoryTagAssociation_table)
    drop_table(Tag_table)
