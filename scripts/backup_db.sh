#!/bin/bash
# Database Backup Script for ZeroPass
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
DB_NAME="zeropass"
DB_USER="postgres"

mkdir -p $BACKUP_DIR

echo "Starting backup for $DB_NAME..."
docker exec zeropass-db pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -name "*.sql" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_backup_$TIMESTAMP.sql"
