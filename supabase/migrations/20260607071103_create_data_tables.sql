-- 할 일 목록 테이블
CREATE TABLE IF NOT EXISTS todos (
  id BIGSERIAL PRIMARY KEY,
  text VARCHAR(255) NOT NULL,
  priority VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  assigned_to VARCHAR(100),
  deadline DATE,
  category VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 주간 일정 테이블
CREATE TABLE IF NOT EXISTS schedules (
  id BIGSERIAL PRIMARY KEY,
  day VARCHAR(10) NOT NULL,
  time VARCHAR(10),
  event TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 프로젝트 현황 테이블
CREATE TABLE IF NOT EXISTS projects (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  progress INT NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL,
  assigned_to VARCHAR(100),
  start_date DATE,
  deadline DATE,
  budget BIGINT,
  spent BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 매출 데이터 테이블
CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  product VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  quantity INT NOT NULL,
  unit_price BIGINT NOT NULL,
  amount BIGINT NOT NULL,
  region VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product);

-- RLS 정책 (Read-only)
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- 모두 읽기 가능
CREATE POLICY "Allow read access" ON todos FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON schedules FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON projects FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON sales FOR SELECT USING (true);
