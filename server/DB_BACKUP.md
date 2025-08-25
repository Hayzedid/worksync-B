# Database Backup

To back up your MySQL database:

```
mysqldump -u <user> -p<password> worksync > worksync_backup.sql
```

# Database Restore

To restore from a backup:

```
mysql -u <user> -p<password> worksync < worksync_backup.sql
```

# Notes
- Run these commands from your server or a machine with MySQL client access.
- Replace `<user>` and `<password>` with your DB credentials.
- Schedule regular backups using cron or a CI/CD job for production.
