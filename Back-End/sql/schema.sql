-- Create the Users table if it doesn't exist (PascalCase per app queries)
IF NOT EXISTS (
    SELECT 1 FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
    WHERE t.name='Users' AND s.name='dbo'
)
BEGIN
    CREATE TABLE dbo.Users (
            id BIGINT PRIMARY KEY IDENTITY(1,1),
            username NVARCHAR(50) NOT NULL UNIQUE,
            password_hash NVARCHAR(255) NOT NULL,
            created_at DATETIME2 DEFAULT GETDATE()
    );
END
GO

-- Add user_preferences JSON column on dbo.Users if missing
IF COL_LENGTH('dbo.Users', 'user_preferences') IS NULL
BEGIN
    ALTER TABLE dbo.Users
        ADD [user_preferences] NVARCHAR(MAX) NULL
                CONSTRAINT DF_Users_user_preferences DEFAULT (N'{}');
END;

IF NOT EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE name = 'CK_Users_user_preferences_IsJson'
)
BEGIN
    ALTER TABLE dbo.Users
        ADD CONSTRAINT CK_Users_user_preferences_IsJson
            CHECK ([user_preferences] IS NULL OR ISJSON([user_preferences]) = 1);
END;
GO

-- Deprecated: separate user_preferences table is no longer used after moving JSON into dbo.Users.user_preferences
-- Keeping here commented for reference; do not create to avoid drift.
-- IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_preferences' and xtype='U')
-- CREATE TABLE user_preferences (
--     id BIGINT PRIMARY KEY IDENTITY(1,1),
--     user_id BIGINT NOT NULL UNIQUE,
--     layout_order NVARCHAR(MAX) NULL, -- JSON string like ["calendar","chart"]
--     updated_at DATETIME2 DEFAULT GETDATE(),
--     CONSTRAINT fk_user_pref_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
-- );
-- GO

-- Create the receipts table if it doesn't exist
IF NOT EXISTS (
    SELECT 1 FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
    WHERE t.name='receipts' AND s.name='dbo'
)
BEGIN
    CREATE TABLE receipts (
            id BIGINT PRIMARY KEY IDENTITY(1,1),
            user_id BIGINT NOT NULL,
            store_name NVARCHAR(120),
            total_amount DECIMAL(12, 2),
            transaction_date DATETIME2,
            category NVARCHAR(50) NOT NULL DEFAULT N'분류 대기',
            source_blob_url NVARCHAR(MAX),
            created_at DATETIME2 DEFAULT GETDATE(),
            updated_at DATETIME2 DEFAULT GETDATE(),
            CONSTRAINT fk_receipts_user FOREIGN KEY (user_id) REFERENCES dbo.Users(id) ON DELETE CASCADE
    );
END
GO

-- Create indexes for performance
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_receipts_user' AND object_id = OBJECT_ID('receipts'))
    CREATE INDEX idx_receipts_user ON receipts(user_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_receipts_date' AND object_id = OBJECT_ID('receipts'))
    CREATE INDEX idx_receipts_date ON receipts(transaction_date);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_receipts_category' AND object_id = OBJECT_ID('receipts'))
    CREATE INDEX idx_receipts_category ON receipts(category);
GO
