-- 删除旧表（按依赖顺序）
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS quote_executions CASCADE;
DROP TABLE IF EXISTS coverage_configs CASCADE;
DROP TABLE IF EXISTS current_insurance CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS applicants CASCADE;

-- ===== 从这里开始 CREATE TABLE =====

CREATE TABLE applicants (
    id SERIAL PRIMARY KEY,
    xref_key VARCHAR(64) UNIQUE,                  -- 对应 Ezlynx xRefKey
    
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    birth_date DATE,
    gender VARCHAR(20),
    marital_status VARCHAR(20),

    address VARCHAR(255),
    unit VARCHAR(50),
    city VARCHAR(100),
    state VARCHAR(10),
    zip_code VARCHAR(20),
    residence VARCHAR(50),                        -- Own / Rent
    
    phone VARCHAR(50),
    email VARCHAR(255),

    status VARCHAR(20) DEFAULT 'draft',           -- draft / submitted / quoted

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    extra JSONB DEFAULT '{}'                      -- ⭐扩展字段
);


CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    applicant_id INT REFERENCES applicants(id) ON DELETE CASCADE,

    first_name VARCHAR(100),
    last_name VARCHAR(100),
    birth_date DATE,

    relationship VARCHAR(50),        -- Self / Spouse / Child / Other
    marital_status VARCHAR(20),
    
    occupation VARCHAR(100),
    education VARCHAR(100),

    dl_number VARCHAR(50),
    dl_state VARCHAR(10),

    violations JSONB DEFAULT '[]',               -- ⭐违规记录：可扩展
    accidents JSONB DEFAULT '[]',                -- ⭐事故记录：可扩展
    extra JSONB DEFAULT '{}',                    -- ⭐扩展字段

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    applicant_id INT REFERENCES applicants(id) ON DELETE CASCADE,

    vin VARCHAR(50),
    year VARCHAR(10),
    make VARCHAR(100),
    model VARCHAR(100),
    sub_model VARCHAR(100),

    ownership VARCHAR(20),        -- Own / Finance / Lease
    usage VARCHAR(20),            -- Commute / Pleasure / Business / Farm
    mileage VARCHAR(20),

    safety_features JSONB DEFAULT '[]',           -- ⭐扩展字段
    extra JSONB DEFAULT '{}',                     -- ⭐扩展字段

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE current_insurance (
    id SERIAL PRIMARY KEY,
    applicant_id INT REFERENCES applicants(id) ON DELETE CASCADE,

    has_insurance VARCHAR(10),        -- Yes / No
    provider VARCHAR(255),
    duration VARCHAR(50),
    bodily_injury_limit VARCHAR(50),
    lapse_duration VARCHAR(50),

    claims JSONB DEFAULT '[]',                -- ⭐理赔历史
    extra JSONB DEFAULT '{}',                 -- ⭐扩展字段

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE coverage_configs (
    id SERIAL PRIMARY KEY,
    applicant_id INT REFERENCES applicants(id) ON DELETE CASCADE,

    bi_pd_liability VARCHAR(50),
    uninsured_motorist VARCHAR(50),
    pip VARCHAR(50),
    collision VARCHAR(50),
    comprehensive VARCHAR(50),
    rental VARCHAR(50),
    roadside_assistance VARCHAR(50),

    umbrella VARCHAR(50),                     -- ⭐未来扩展
    gap VARCHAR(50),                          -- ⭐GAP 保险
    glass_coverage VARCHAR(50),               -- ⭐玻璃险

    extra JSONB DEFAULT '{}',                 -- ⭐扩展字段

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE quote_executions (
    id SERIAL PRIMARY KEY,
    applicant_id INT REFERENCES applicants(id) ON DELETE CASCADE,

    quote_execution_id VARCHAR(50) UNIQUE,        -- Ezlynx 返回的 ID
    carrier_id INT,
    carrier_name VARCHAR(255),
    status VARCHAR(20),                      -- Succeeded / Failed
    submitted_at TIMESTAMP DEFAULT NOW(),

    error_message TEXT,
    retry_count INT DEFAULT 0,
    completed_at TIMESTAMP,

    extra JSONB DEFAULT '{}',                -- ⭐扩展字段
    raw_response JSONB,                      -- ⭐完整返回内容（强烈建议保存）
    
    created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE quotes (
    id SERIAL PRIMARY KEY,
    applicant_id INT REFERENCES applicants(id) ON DELETE CASCADE,
    quote_execution_id VARCHAR(50),

    carrier_id INT,
    carrier_name VARCHAR(100),

    premium NUMERIC(10, 2),                 -- ⭐最终 premium
    term VARCHAR(50),                       -- 6 months / 12 months

    deductible JSONB DEFAULT '{}',          -- ⭐carrier-specific
    discounts JSONB DEFAULT '{}',           -- ⭐衍生折扣
    fees JSONB DEFAULT '{}',                -- ⭐service fees
    
    extra JSONB DEFAULT '{}',               -- ⭐扩展字段
    raw JSONB,                              -- ⭐存储 carrier 原始 quote

    created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    applicant_id INT REFERENCES applicants(id),

    event VARCHAR(255),
    message TEXT,
    duration_ms INT,
    
    extra JSONB DEFAULT '{}',               -- ⭐扩展字段
    
    created_at TIMESTAMP DEFAULT NOW()
);

