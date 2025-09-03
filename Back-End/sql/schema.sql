-- Create the users table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' and xtype='U')
CREATE TABLE users (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    username NVARCHAR(50) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE()
);
GO

-- Create the receipts table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='receipts' and xtype='U')
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
    CONSTRAINT fk_receipts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
GO

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_receipts_user ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(transaction_date);
CREATE INDEX IF NOT EXISTS idx_receipts_category ON receipts(category);
GO
