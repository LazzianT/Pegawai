IF OBJECT_ID('dbo.hris_Travel_Group', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.hris_Travel_Group (
    GroupCode VARCHAR(32) NOT NULL CONSTRAINT PK_hris_Travel_Group PRIMARY KEY,
    CreatorNIP VARCHAR(50) NOT NULL,
    Status VARCHAR(32) NOT NULL,
    JoinOpen BIT NOT NULL CONSTRAINT DF_hris_Travel_Group_JoinOpen DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_hris_Travel_Group_CreatedAt DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NULL
  );
END;

IF OBJECT_ID('dbo.hris_Travel_Group_Version', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.hris_Travel_Group_Version (
    GroupCode VARCHAR(32) NOT NULL,
    VersionNo INT NOT NULL,
    ExitDate DATE NOT NULL,
    ExitTime VARCHAR(8) NOT NULL,
    Tujuan NVARCHAR(500) NOT NULL,
    Tugas NVARCHAR(MAX) NOT NULL,
    VehicleType VARCHAR(16) NULL,
    VehiclePlate VARCHAR(32) NULL,
    Status VARCHAR(32) NOT NULL,
    CreatedBy VARCHAR(50) NOT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_hris_Travel_Group_Version_CreatedAt DEFAULT GETDATE(),
    CONSTRAINT PK_hris_Travel_Group_Version PRIMARY KEY (GroupCode, VersionNo),
    CONSTRAINT FK_hris_Travel_Group_Version_Group FOREIGN KEY (GroupCode) REFERENCES dbo.hris_Travel_Group(GroupCode)
  );
END;

IF OBJECT_ID('dbo.hris_Travel_Group_Member', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.hris_Travel_Group_Member (
    GroupCode VARCHAR(32) NOT NULL,
    VersionNo INT NOT NULL,
    NIP VARCHAR(50) NOT NULL,
    Status VARCHAR(16) NOT NULL,
    JoinedAt DATETIME2 NOT NULL CONSTRAINT DF_hris_Travel_Group_Member_JoinedAt DEFAULT GETDATE(),
    RemovedAt DATETIME2 NULL,
    CONSTRAINT PK_hris_Travel_Group_Member PRIMARY KEY (GroupCode, VersionNo, NIP),
    CONSTRAINT FK_hris_Travel_Group_Member_Version FOREIGN KEY (GroupCode, VersionNo) REFERENCES dbo.hris_Travel_Group_Version(GroupCode, VersionNo)
  );
END;

IF OBJECT_ID('dbo.hris_Travel_Group_Join', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.hris_Travel_Group_Join (
    GroupCode VARCHAR(32) NOT NULL,
    NIP VARCHAR(50) NOT NULL,
    Status VARCHAR(16) NOT NULL,
    RequestedAt DATETIME2 NOT NULL CONSTRAINT DF_hris_Travel_Group_Join_RequestedAt DEFAULT GETDATE(),
    ConfirmedAt DATETIME2 NULL,
    CONSTRAINT PK_hris_Travel_Group_Join PRIMARY KEY (GroupCode, NIP),
    CONSTRAINT FK_hris_Travel_Group_Join_Group FOREIGN KEY (GroupCode) REFERENCES dbo.hris_Travel_Group(GroupCode)
  );
END;

IF COL_LENGTH('dbo.hris_Travel_Group_Version', 'VehicleType') IS NULL ALTER TABLE dbo.hris_Travel_Group_Version ADD VehicleType VARCHAR(16) NULL;
IF COL_LENGTH('dbo.hris_Travel_Group_Version', 'VehiclePlate') IS NULL ALTER TABLE dbo.hris_Travel_Group_Version ADD VehiclePlate VARCHAR(32) NULL;
IF COL_LENGTH('dbo.hris_Travel_Group_Version', 'QrToken') IS NULL ALTER TABLE dbo.hris_Travel_Group_Version ADD QrToken VARCHAR(48) NULL;
IF COL_LENGTH('dbo.hris_Travel_Group_Version', 'DepartureAt') IS NULL ALTER TABLE dbo.hris_Travel_Group_Version ADD DepartureAt DATETIME2 NULL;
IF COL_LENGTH('dbo.hris_Travel_Group_Version', 'DriverMode') IS NULL ALTER TABLE dbo.hris_Travel_Group_Version ADD DriverMode VARCHAR(16) NULL;
IF COL_LENGTH('dbo.hris_Travel_Group_Version', 'DriverNIP') IS NULL ALTER TABLE dbo.hris_Travel_Group_Version ADD DriverNIP VARCHAR(50) NULL;
IF COL_LENGTH('dbo.hris_Travel_Group_Version', 'DriverName') IS NULL ALTER TABLE dbo.hris_Travel_Group_Version ADD DriverName NVARCHAR(200) NULL;
IF COL_LENGTH('dbo.hris_Travel_Group', 'AutoClosedAt') IS NULL ALTER TABLE dbo.hris_Travel_Group ADD AutoClosedAt DATETIME2 NULL;

IF OBJECT_ID('dbo.hris_Travel_Group_Approval', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.hris_Travel_Group_Approval (
    GroupCode VARCHAR(32) NOT NULL,
    VersionNo INT NOT NULL,
    ApprovalType VARCHAR(16) NOT NULL,
    ApproverNIP VARCHAR(50) NOT NULL,
    StatusId INT NOT NULL CONSTRAINT DF_hris_Travel_Group_Approval_StatusId DEFAULT 1,
    UpdatedAt DATETIME2 NULL,
    CONSTRAINT PK_hris_Travel_Group_Approval PRIMARY KEY (GroupCode, VersionNo, ApprovalType, ApproverNIP),
    CONSTRAINT FK_hris_Travel_Group_Approval_Version FOREIGN KEY (GroupCode, VersionNo) REFERENCES dbo.hris_Travel_Group_Version(GroupCode, VersionNo)
  );
END;
