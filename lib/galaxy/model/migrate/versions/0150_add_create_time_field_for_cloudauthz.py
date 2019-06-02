"""
Adds `create_time` columns to cloudauthz table.
"""

from __future__ import print_function

import logging

from sqlalchemy import Column, DateTime, MetaData, Table

from galaxy.model.migrate.versions.util import add_column, drop_column

log = logging.getLogger(__name__)
metadata = MetaData()


def upgrade(migrate_engine):
    print(__doc__)
    metadata.bind = migrate_engine
    metadata.reflect()

    cloudauthz_table = Table("cloudauthz", metadata, autoload=True)
    create_time_column = Column("create_time", DateTime)
    add_column(create_time_column, cloudauthz_table)


def downgrade(migrate_engine):
    metadata.bind = migrate_engine
    metadata.reflect()

    cloudauthz_table = Table("cloudauthz", metadata, autoload=True)
    drop_column("create_time", cloudauthz_table)
