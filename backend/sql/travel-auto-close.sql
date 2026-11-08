IF COL_LENGTH('dbo.hris_Travel', 'AutoClosedAt') IS NULL
  ALTER TABLE dbo.hris_Travel ADD AutoClosedAt DATETIME2 NULL;

IF COL_LENGTH('dbo.hris_Travel_Group', 'AutoClosedAt') IS NULL
  ALTER TABLE dbo.hris_Travel_Group ADD AutoClosedAt DATETIME2 NULL;

IF COL_LENGTH('dbo.hris_Travel_Group_Version', 'AutoClosedAt') IS NULL
  ALTER TABLE dbo.hris_Travel_Group_Version ADD AutoClosedAt DATETIME2 NULL;

IF COL_LENGTH('dbo.hris_Travel', 'DriverMode') IS NULL
  ALTER TABLE dbo.hris_Travel ADD DriverMode VARCHAR(16) NULL;
IF COL_LENGTH('dbo.hris_Travel', 'DriverNIP') IS NULL
  ALTER TABLE dbo.hris_Travel ADD DriverNIP VARCHAR(50) NULL;
IF COL_LENGTH('dbo.hris_Travel', 'DriverName') IS NULL
  ALTER TABLE dbo.hris_Travel ADD DriverName NVARCHAR(200) NULL;
IF COL_LENGTH('dbo.hris_Travel_Group_Version', 'DriverMode') IS NULL
  ALTER TABLE dbo.hris_Travel_Group_Version ADD DriverMode VARCHAR(16) NULL;
IF COL_LENGTH('dbo.hris_Travel_Group_Version', 'DriverNIP') IS NULL
  ALTER TABLE dbo.hris_Travel_Group_Version ADD DriverNIP VARCHAR(50) NULL;
IF COL_LENGTH('dbo.hris_Travel_Group_Version', 'DriverName') IS NULL
  ALTER TABLE dbo.hris_Travel_Group_Version ADD DriverName NVARCHAR(200) NULL;
