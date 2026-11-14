CREATE TABLE products (
    id              UUID PRIMARY KEY,
    sku             VARCHAR(64)    NOT NULL UNIQUE,
    name            VARCHAR(200)   NOT NULL,
    description     VARCHAR(4000)  NOT NULL,
    category        VARCHAR(80)    NOT NULL,
    brand           VARCHAR(80),
    price           NUMERIC(10, 2) NOT NULL,
    currency        CHAR(3)        NOT NULL,
    stock_quantity  INTEGER        NOT NULL CHECK (stock_quantity >= 0),
    active          BOOLEAN        NOT NULL DEFAULT TRUE,
    version         BIGINT         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ    NOT NULL,
    updated_at      TIMESTAMPTZ    NOT NULL
);
