CREATE TABLE IF NOT EXISTS monthly_statistics (
  month DATE NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('Sales', 'Engineering', 'Marketing', 'Operations')),
  revenue NUMERIC(14, 2) NOT NULL CHECK (revenue >= 0),
  expenses NUMERIC(14, 2) NOT NULL CHECK (expenses >= 0),
  sales INTEGER NOT NULL CHECK (sales >= 0),
  employees INTEGER NOT NULL CHECK (employees >= 0),
  PRIMARY KEY (month, department)
);
