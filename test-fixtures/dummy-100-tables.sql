-- ============================================================
-- ERDify 가져오기 테스트용 더미 스키마
-- 도메인: 이커머스 + 기업 관리 플랫폼
-- 테이블 수: 100개
-- 다이얼렉트: PostgreSQL
-- ============================================================

-- ─── 1. 조직 / 계정 ───────────────────────────────────────

CREATE TABLE organizations (
  id            uuid        NOT NULL,
  name          varchar(200) NOT NULL,
  slug          varchar(100) NOT NULL,
  plan          varchar(50)  NOT NULL DEFAULT 'free',
  owner_id      uuid,
  created_at    timestamp   NOT NULL DEFAULT now(),
  updated_at    timestamp   NOT NULL DEFAULT now(),
  deleted_at    timestamp,
  PRIMARY KEY (id)
);

CREATE TABLE users (
  id            uuid        NOT NULL,
  org_id        uuid        NOT NULL,
  email         varchar(255) NOT NULL,
  password_hash varchar(255),
  name          varchar(100) NOT NULL,
  avatar_url    varchar(500),
  role          varchar(50)  NOT NULL DEFAULT 'member',
  status        varchar(20)  NOT NULL DEFAULT 'active',
  last_login_at timestamp,
  created_at    timestamp   NOT NULL DEFAULT now(),
  updated_at    timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (email),
  REFERENCES organizations (id)
);

CREATE TABLE roles (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  name        varchar(100) NOT NULL,
  description text,
  is_system   boolean     NOT NULL DEFAULT false,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE permissions (
  id          uuid        NOT NULL,
  code        varchar(100) NOT NULL,
  description text,
  module      varchar(50)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (code)
);

CREATE TABLE role_permissions (
  role_id       uuid NOT NULL,
  permission_id uuid NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  REFERENCES roles (id),
  REFERENCES permissions (id)
);

CREATE TABLE user_roles (
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  PRIMARY KEY (user_id, role_id),
  REFERENCES users (id),
  REFERENCES roles (id)
);

CREATE TABLE sessions (
  id         uuid        NOT NULL,
  user_id    uuid        NOT NULL,
  token      varchar(512) NOT NULL,
  ip_address varchar(50),
  user_agent text,
  expires_at timestamp   NOT NULL,
  created_at timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (token),
  REFERENCES users (id)
);

CREATE TABLE oauth_accounts (
  id          uuid        NOT NULL,
  user_id     uuid        NOT NULL,
  provider    varchar(50)  NOT NULL,
  provider_id varchar(255) NOT NULL,
  access_token  text,
  refresh_token text,
  token_expiry  timestamp,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES users (id)
);

CREATE TABLE departments (
  id         uuid        NOT NULL,
  org_id     uuid        NOT NULL,
  name       varchar(100) NOT NULL,
  parent_id  uuid,
  manager_id uuid,
  created_at timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE teams (
  id            uuid        NOT NULL,
  org_id        uuid        NOT NULL,
  department_id uuid,
  name          varchar(100) NOT NULL,
  description   text,
  created_at    timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id),
  REFERENCES departments (id)
);

CREATE TABLE team_members (
  team_id    uuid        NOT NULL,
  user_id    uuid        NOT NULL,
  role       varchar(50)  NOT NULL DEFAULT 'member',
  joined_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id),
  REFERENCES teams (id),
  REFERENCES users (id)
);

-- ─── 2. 상품 카탈로그 ─────────────────────────────────────

CREATE TABLE brands (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  name        varchar(200) NOT NULL,
  slug        varchar(200) NOT NULL,
  logo_url    varchar(500),
  website     varchar(300),
  description text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamp   NOT NULL DEFAULT now(),
  updated_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE categories (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  parent_id   uuid,
  name        varchar(200) NOT NULL,
  slug        varchar(200) NOT NULL,
  description text,
  image_url   varchar(500),
  sort_order  int         NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE products (
  id            uuid          NOT NULL,
  org_id        uuid          NOT NULL,
  brand_id      uuid,
  category_id   uuid,
  sku           varchar(100)  NOT NULL,
  name          varchar(300)  NOT NULL,
  slug          varchar(300)  NOT NULL,
  description   text,
  status        varchar(20)   NOT NULL DEFAULT 'draft',
  base_price    decimal(12,2) NOT NULL DEFAULT 0,
  cost_price    decimal(12,2),
  weight_kg     decimal(8,3),
  is_digital    boolean       NOT NULL DEFAULT false,
  created_at    timestamp     NOT NULL DEFAULT now(),
  updated_at    timestamp     NOT NULL DEFAULT now(),
  deleted_at    timestamp,
  PRIMARY KEY (id),
  UNIQUE (org_id, sku),
  REFERENCES organizations (id),
  REFERENCES brands (id),
  REFERENCES categories (id)
);

CREATE TABLE product_attributes (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  name        varchar(100) NOT NULL,
  type        varchar(30)  NOT NULL DEFAULT 'text',
  is_required boolean     NOT NULL DEFAULT false,
  sort_order  int         NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE product_attribute_values (
  id           uuid        NOT NULL,
  attribute_id uuid        NOT NULL,
  product_id   uuid        NOT NULL,
  value        text        NOT NULL,
  PRIMARY KEY (id),
  REFERENCES product_attributes (id),
  REFERENCES products (id)
);

CREATE TABLE product_variants (
  id            uuid          NOT NULL,
  product_id    uuid          NOT NULL,
  sku           varchar(100)  NOT NULL,
  name          varchar(200)  NOT NULL,
  price         decimal(12,2) NOT NULL,
  compare_price decimal(12,2),
  weight_kg     decimal(8,3),
  is_default    boolean       NOT NULL DEFAULT false,
  is_active     boolean       NOT NULL DEFAULT true,
  sort_order    int           NOT NULL DEFAULT 0,
  created_at    timestamp     NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (sku),
  REFERENCES products (id)
);

CREATE TABLE variant_options (
  id         uuid        NOT NULL,
  variant_id uuid        NOT NULL,
  name       varchar(100) NOT NULL,
  value      varchar(100) NOT NULL,
  PRIMARY KEY (id),
  REFERENCES product_variants (id)
);

CREATE TABLE product_images (
  id         uuid        NOT NULL,
  product_id uuid        NOT NULL,
  variant_id uuid,
  url        varchar(500) NOT NULL,
  alt_text   varchar(255),
  sort_order int         NOT NULL DEFAULT 0,
  is_primary boolean     NOT NULL DEFAULT false,
  created_at timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES products (id),
  REFERENCES product_variants (id)
);

CREATE TABLE product_tags (
  product_id uuid        NOT NULL,
  tag        varchar(100) NOT NULL,
  PRIMARY KEY (product_id, tag),
  REFERENCES products (id)
);

CREATE TABLE collections (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  name        varchar(200) NOT NULL,
  slug        varchar(200) NOT NULL,
  description text,
  image_url   varchar(500),
  is_active   boolean     NOT NULL DEFAULT true,
  sort_order  int         NOT NULL DEFAULT 0,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE collection_products (
  collection_id uuid NOT NULL,
  product_id    uuid NOT NULL,
  sort_order    int  NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, product_id),
  REFERENCES collections (id),
  REFERENCES products (id)
);

-- ─── 3. 재고 ──────────────────────────────────────────────

CREATE TABLE warehouses (
  id         uuid        NOT NULL,
  org_id     uuid        NOT NULL,
  name       varchar(200) NOT NULL,
  code       varchar(50)  NOT NULL,
  address    text,
  city       varchar(100),
  country    varchar(10)  NOT NULL DEFAULT 'KR',
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE inventory_items (
  id          uuid NOT NULL,
  variant_id  uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  quantity    int  NOT NULL DEFAULT 0,
  reserved    int  NOT NULL DEFAULT 0,
  reorder_qty int  NOT NULL DEFAULT 0,
  reorder_pt  int  NOT NULL DEFAULT 0,
  updated_at  timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (variant_id, warehouse_id),
  REFERENCES product_variants (id),
  REFERENCES warehouses (id)
);

CREATE TABLE inventory_movements (
  id           uuid          NOT NULL,
  variant_id   uuid          NOT NULL,
  warehouse_id uuid          NOT NULL,
  type         varchar(30)   NOT NULL,
  quantity     int           NOT NULL,
  reference_id uuid,
  reference_type varchar(50),
  note         text,
  created_by   uuid,
  created_at   timestamp     NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES product_variants (id),
  REFERENCES warehouses (id)
);

CREATE TABLE purchase_orders (
  id             uuid          NOT NULL,
  org_id         uuid          NOT NULL,
  supplier_id    uuid,
  warehouse_id   uuid          NOT NULL,
  status         varchar(30)   NOT NULL DEFAULT 'draft',
  expected_at    date,
  received_at    timestamp,
  total_amount   decimal(14,2) NOT NULL DEFAULT 0,
  note           text,
  created_by     uuid          NOT NULL,
  created_at     timestamp     NOT NULL DEFAULT now(),
  updated_at     timestamp     NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id),
  REFERENCES warehouses (id)
);

CREATE TABLE purchase_order_items (
  id               uuid          NOT NULL,
  purchase_order_id uuid         NOT NULL,
  variant_id       uuid          NOT NULL,
  quantity         int           NOT NULL,
  received_qty     int           NOT NULL DEFAULT 0,
  unit_cost        decimal(12,2) NOT NULL,
  PRIMARY KEY (id),
  REFERENCES purchase_orders (id),
  REFERENCES product_variants (id)
);

CREATE TABLE suppliers (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  name        varchar(200) NOT NULL,
  email       varchar(255),
  phone       varchar(50),
  address     text,
  country     varchar(10)  NOT NULL DEFAULT 'KR',
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

-- ─── 4. 고객 ──────────────────────────────────────────────

CREATE TABLE customers (
  id            uuid        NOT NULL,
  org_id        uuid        NOT NULL,
  email         varchar(255) NOT NULL,
  name          varchar(100) NOT NULL,
  phone         varchar(50),
  birth_date    date,
  gender        varchar(10),
  grade         varchar(30)  NOT NULL DEFAULT 'regular',
  total_spent   decimal(14,2) NOT NULL DEFAULT 0,
  order_count   int          NOT NULL DEFAULT 0,
  accepts_marketing boolean  NOT NULL DEFAULT false,
  status        varchar(20)  NOT NULL DEFAULT 'active',
  created_at    timestamp    NOT NULL DEFAULT now(),
  updated_at    timestamp    NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (org_id, email),
  REFERENCES organizations (id)
);

CREATE TABLE customer_addresses (
  id          uuid        NOT NULL,
  customer_id uuid        NOT NULL,
  alias       varchar(50),
  recipient   varchar(100) NOT NULL,
  phone       varchar(50),
  address1    varchar(300) NOT NULL,
  address2    varchar(300),
  city        varchar(100) NOT NULL,
  province    varchar(100),
  postal_code varchar(20)  NOT NULL,
  country     varchar(10)  NOT NULL DEFAULT 'KR',
  is_default  boolean     NOT NULL DEFAULT false,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES customers (id)
);

CREATE TABLE customer_groups (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  name        varchar(100) NOT NULL,
  description text,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE customer_group_members (
  group_id    uuid NOT NULL,
  customer_id uuid NOT NULL,
  added_at    timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, customer_id),
  REFERENCES customer_groups (id),
  REFERENCES customers (id)
);

CREATE TABLE customer_notes (
  id          uuid        NOT NULL,
  customer_id uuid        NOT NULL,
  content     text        NOT NULL,
  created_by  uuid        NOT NULL,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES customers (id)
);

-- ─── 5. 주문 ──────────────────────────────────────────────

CREATE TABLE orders (
  id                uuid          NOT NULL,
  org_id            uuid          NOT NULL,
  customer_id       uuid,
  status            varchar(30)   NOT NULL DEFAULT 'pending',
  payment_status    varchar(30)   NOT NULL DEFAULT 'unpaid',
  fulfillment_status varchar(30)  NOT NULL DEFAULT 'unfulfilled',
  subtotal          decimal(14,2) NOT NULL DEFAULT 0,
  discount_amount   decimal(14,2) NOT NULL DEFAULT 0,
  shipping_amount   decimal(14,2) NOT NULL DEFAULT 0,
  tax_amount        decimal(14,2) NOT NULL DEFAULT 0,
  total_amount      decimal(14,2) NOT NULL DEFAULT 0,
  currency          varchar(10)   NOT NULL DEFAULT 'KRW',
  note              text,
  shipping_address  text,
  billing_address   text,
  ip_address        varchar(50),
  source            varchar(50),
  created_at        timestamp     NOT NULL DEFAULT now(),
  updated_at        timestamp     NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id),
  REFERENCES customers (id)
);

CREATE TABLE order_items (
  id          uuid          NOT NULL,
  order_id    uuid          NOT NULL,
  variant_id  uuid,
  product_id  uuid,
  sku         varchar(100)  NOT NULL,
  name        varchar(300)  NOT NULL,
  quantity    int           NOT NULL,
  unit_price  decimal(12,2) NOT NULL,
  discount    decimal(12,2) NOT NULL DEFAULT 0,
  total       decimal(12,2) NOT NULL,
  fulfilled_qty int         NOT NULL DEFAULT 0,
  returned_qty  int         NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  REFERENCES orders (id),
  REFERENCES product_variants (id)
);

CREATE TABLE order_events (
  id         uuid        NOT NULL,
  order_id   uuid        NOT NULL,
  type       varchar(50)  NOT NULL,
  message    text,
  created_by uuid,
  created_at timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES orders (id)
);

CREATE TABLE returns (
  id          uuid        NOT NULL,
  order_id    uuid        NOT NULL,
  status      varchar(30)  NOT NULL DEFAULT 'requested',
  reason      varchar(100),
  note        text,
  refund_amount decimal(12,2),
  created_at  timestamp   NOT NULL DEFAULT now(),
  updated_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES orders (id)
);

CREATE TABLE return_items (
  id          uuid NOT NULL,
  return_id   uuid NOT NULL,
  order_item_id uuid NOT NULL,
  quantity    int  NOT NULL,
  reason      varchar(100),
  condition   varchar(50),
  PRIMARY KEY (id),
  REFERENCES returns (id),
  REFERENCES order_items (id)
);

-- ─── 6. 결제 ──────────────────────────────────────────────

CREATE TABLE payments (
  id             uuid          NOT NULL,
  order_id       uuid          NOT NULL,
  method         varchar(50)   NOT NULL,
  status         varchar(30)   NOT NULL DEFAULT 'pending',
  amount         decimal(14,2) NOT NULL,
  currency       varchar(10)   NOT NULL DEFAULT 'KRW',
  gateway        varchar(50),
  gateway_tx_id  varchar(255),
  paid_at        timestamp,
  failed_at      timestamp,
  failure_reason text,
  created_at     timestamp     NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES orders (id)
);

CREATE TABLE refunds (
  id          uuid          NOT NULL,
  payment_id  uuid          NOT NULL,
  amount      decimal(14,2) NOT NULL,
  status      varchar(30)   NOT NULL DEFAULT 'pending',
  reason      text,
  gateway_ref varchar(255),
  processed_at timestamp,
  created_at  timestamp     NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES payments (id)
);

CREATE TABLE payment_methods (
  id          uuid        NOT NULL,
  customer_id uuid        NOT NULL,
  type        varchar(50)  NOT NULL,
  provider    varchar(50)  NOT NULL,
  token       varchar(255),
  last4       varchar(4),
  expiry      varchar(7),
  is_default  boolean     NOT NULL DEFAULT false,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES customers (id)
);

-- ─── 7. 배송 ──────────────────────────────────────────────

CREATE TABLE shipping_methods (
  id           uuid          NOT NULL,
  org_id       uuid          NOT NULL,
  carrier_id   uuid,
  name         varchar(200)  NOT NULL,
  code         varchar(50)   NOT NULL,
  base_fee     decimal(10,2) NOT NULL DEFAULT 0,
  free_over    decimal(12,2),
  is_active    boolean       NOT NULL DEFAULT true,
  estimated_days int,
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE carriers (
  id         uuid        NOT NULL,
  name       varchar(100) NOT NULL,
  code       varchar(30)  NOT NULL,
  track_url  varchar(300),
  is_active  boolean     NOT NULL DEFAULT true,
  PRIMARY KEY (id),
  UNIQUE (code)
);

CREATE TABLE shipments (
  id                 uuid        NOT NULL,
  order_id           uuid        NOT NULL,
  carrier_id         uuid,
  shipping_method_id uuid,
  tracking_number    varchar(100),
  status             varchar(30)  NOT NULL DEFAULT 'preparing',
  shipped_at         timestamp,
  delivered_at       timestamp,
  address            text        NOT NULL,
  created_at         timestamp   NOT NULL DEFAULT now(),
  updated_at         timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES orders (id),
  REFERENCES carriers (id),
  REFERENCES shipping_methods (id)
);

CREATE TABLE shipment_items (
  id          uuid NOT NULL,
  shipment_id uuid NOT NULL,
  order_item_id uuid NOT NULL,
  quantity    int  NOT NULL,
  PRIMARY KEY (id),
  REFERENCES shipments (id),
  REFERENCES order_items (id)
);

CREATE TABLE tracking_events (
  id          uuid        NOT NULL,
  shipment_id uuid        NOT NULL,
  status      varchar(50)  NOT NULL,
  location    varchar(200),
  description text,
  occurred_at timestamp   NOT NULL,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES shipments (id)
);

-- ─── 8. 마케팅 ────────────────────────────────────────────

CREATE TABLE coupons (
  id              uuid          NOT NULL,
  org_id          uuid          NOT NULL,
  code            varchar(50)   NOT NULL,
  type            varchar(30)   NOT NULL DEFAULT 'percent',
  value           decimal(10,2) NOT NULL,
  min_order_amount decimal(12,2),
  max_discount    decimal(12,2),
  usage_limit     int,
  usage_count     int           NOT NULL DEFAULT 0,
  per_customer_limit int,
  valid_from      timestamp,
  valid_until     timestamp,
  is_active       boolean       NOT NULL DEFAULT true,
  created_at      timestamp     NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (org_id, code),
  REFERENCES organizations (id)
);

CREATE TABLE coupon_uses (
  id          uuid        NOT NULL,
  coupon_id   uuid        NOT NULL,
  order_id    uuid        NOT NULL,
  customer_id uuid,
  discount    decimal(12,2) NOT NULL,
  used_at     timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES coupons (id),
  REFERENCES orders (id)
);

CREATE TABLE campaigns (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  name        varchar(200) NOT NULL,
  type        varchar(50)  NOT NULL,
  status      varchar(30)  NOT NULL DEFAULT 'draft',
  starts_at   timestamp,
  ends_at     timestamp,
  budget      decimal(14,2),
  spent       decimal(14,2) NOT NULL DEFAULT 0,
  created_by  uuid        NOT NULL,
  created_at  timestamp   NOT NULL DEFAULT now(),
  updated_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE campaign_targets (
  id          uuid        NOT NULL,
  campaign_id uuid        NOT NULL,
  type        varchar(30)  NOT NULL,
  target_id   uuid,
  PRIMARY KEY (id),
  REFERENCES campaigns (id)
);

CREATE TABLE email_templates (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  name        varchar(200) NOT NULL,
  subject     varchar(300) NOT NULL,
  body_html   text        NOT NULL,
  body_text   text,
  variables   text,
  created_at  timestamp   NOT NULL DEFAULT now(),
  updated_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE email_sends (
  id          uuid        NOT NULL,
  template_id uuid,
  campaign_id uuid,
  to_email    varchar(255) NOT NULL,
  subject     varchar(300) NOT NULL,
  status      varchar(20)  NOT NULL DEFAULT 'queued',
  sent_at     timestamp,
  opened_at   timestamp,
  clicked_at  timestamp,
  bounced_at  timestamp,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES email_templates (id),
  REFERENCES campaigns (id)
);

CREATE TABLE push_notifications (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  campaign_id uuid,
  title       varchar(200) NOT NULL,
  body        text        NOT NULL,
  target_url  varchar(500),
  status      varchar(20)  NOT NULL DEFAULT 'queued',
  scheduled_at timestamp,
  sent_at     timestamp,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id),
  REFERENCES campaigns (id)
);

-- ─── 9. 리뷰 / 평점 ───────────────────────────────────────

CREATE TABLE reviews (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  product_id  uuid        NOT NULL,
  customer_id uuid,
  order_item_id uuid,
  rating      smallint    NOT NULL,
  title       varchar(200),
  body        text,
  status      varchar(20)  NOT NULL DEFAULT 'pending',
  helpful_count int       NOT NULL DEFAULT 0,
  created_at  timestamp   NOT NULL DEFAULT now(),
  updated_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES products (id),
  REFERENCES customers (id)
);

CREATE TABLE review_images (
  id        uuid        NOT NULL,
  review_id uuid        NOT NULL,
  url       varchar(500) NOT NULL,
  sort_order int        NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  REFERENCES reviews (id)
);

CREATE TABLE review_replies (
  id          uuid        NOT NULL,
  review_id   uuid        NOT NULL,
  body        text        NOT NULL,
  created_by  uuid        NOT NULL,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES reviews (id)
);

CREATE TABLE wishlists (
  id          uuid        NOT NULL,
  customer_id uuid        NOT NULL,
  name        varchar(100) NOT NULL DEFAULT '위시리스트',
  is_public   boolean     NOT NULL DEFAULT false,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES customers (id)
);

CREATE TABLE wishlist_items (
  wishlist_id uuid      NOT NULL,
  product_id  uuid      NOT NULL,
  variant_id  uuid,
  added_at    timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (wishlist_id, product_id),
  REFERENCES wishlists (id),
  REFERENCES products (id)
);

-- ─── 10. 고객 지원 ────────────────────────────────────────

CREATE TABLE support_tickets (
  id            uuid        NOT NULL,
  org_id        uuid        NOT NULL,
  customer_id   uuid,
  order_id      uuid,
  assignee_id   uuid,
  subject       varchar(300) NOT NULL,
  status        varchar(30)  NOT NULL DEFAULT 'open',
  priority      varchar(20)  NOT NULL DEFAULT 'normal',
  channel       varchar(30)  NOT NULL DEFAULT 'email',
  resolved_at   timestamp,
  created_at    timestamp   NOT NULL DEFAULT now(),
  updated_at    timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id),
  REFERENCES customers (id),
  REFERENCES orders (id)
);

CREATE TABLE ticket_messages (
  id          uuid        NOT NULL,
  ticket_id   uuid        NOT NULL,
  sender_type varchar(20)  NOT NULL,
  sender_id   uuid,
  body        text        NOT NULL,
  is_internal boolean     NOT NULL DEFAULT false,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES support_tickets (id)
);

CREATE TABLE ticket_tags (
  ticket_id uuid        NOT NULL,
  tag       varchar(50)  NOT NULL,
  PRIMARY KEY (ticket_id, tag),
  REFERENCES support_tickets (id)
);

CREATE TABLE knowledge_base_articles (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  category_id uuid,
  title       varchar(300) NOT NULL,
  slug        varchar(300) NOT NULL,
  body        text        NOT NULL,
  status      varchar(20)  NOT NULL DEFAULT 'draft',
  views       int         NOT NULL DEFAULT 0,
  helpful     int         NOT NULL DEFAULT 0,
  not_helpful int         NOT NULL DEFAULT 0,
  author_id   uuid        NOT NULL,
  published_at timestamp,
  created_at  timestamp   NOT NULL DEFAULT now(),
  updated_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE kb_categories (
  id         uuid        NOT NULL,
  org_id     uuid        NOT NULL,
  parent_id  uuid,
  name       varchar(100) NOT NULL,
  sort_order int         NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

-- ─── 11. 정산 / 재무 ─────────────────────────────────────

CREATE TABLE invoices (
  id             uuid          NOT NULL,
  org_id         uuid          NOT NULL,
  order_id       uuid,
  customer_id    uuid,
  invoice_number varchar(50)   NOT NULL,
  status         varchar(30)   NOT NULL DEFAULT 'draft',
  subtotal       decimal(14,2) NOT NULL DEFAULT 0,
  tax_amount     decimal(14,2) NOT NULL DEFAULT 0,
  total_amount   decimal(14,2) NOT NULL DEFAULT 0,
  currency       varchar(10)   NOT NULL DEFAULT 'KRW',
  due_date       date,
  paid_at        timestamp,
  issued_at      timestamp,
  created_at     timestamp     NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (org_id, invoice_number),
  REFERENCES organizations (id),
  REFERENCES customers (id)
);

CREATE TABLE invoice_items (
  id          uuid          NOT NULL,
  invoice_id  uuid          NOT NULL,
  description varchar(300)  NOT NULL,
  quantity    int           NOT NULL DEFAULT 1,
  unit_price  decimal(12,2) NOT NULL,
  total       decimal(12,2) NOT NULL,
  PRIMARY KEY (id),
  REFERENCES invoices (id)
);

CREATE TABLE tax_rates (
  id          uuid          NOT NULL,
  org_id      uuid          NOT NULL,
  name        varchar(100)  NOT NULL,
  rate        decimal(6,4)  NOT NULL,
  country     varchar(10)   NOT NULL,
  province    varchar(50),
  is_active   boolean       NOT NULL DEFAULT true,
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE settlements (
  id           uuid          NOT NULL,
  org_id       uuid          NOT NULL,
  period_start date          NOT NULL,
  period_end   date          NOT NULL,
  gross_amount decimal(16,2) NOT NULL DEFAULT 0,
  fee_amount   decimal(14,2) NOT NULL DEFAULT 0,
  net_amount   decimal(16,2) NOT NULL DEFAULT 0,
  status       varchar(30)   NOT NULL DEFAULT 'pending',
  settled_at   timestamp,
  created_at   timestamp     NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

-- ─── 12. 콘텐츠 / CMS ─────────────────────────────────────

CREATE TABLE pages (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  title       varchar(300) NOT NULL,
  slug        varchar(300) NOT NULL,
  body        text,
  status      varchar(20)  NOT NULL DEFAULT 'draft',
  published_at timestamp,
  author_id   uuid        NOT NULL,
  created_at  timestamp   NOT NULL DEFAULT now(),
  updated_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (org_id, slug),
  REFERENCES organizations (id)
);

CREATE TABLE blog_posts (
  id           uuid        NOT NULL,
  org_id       uuid        NOT NULL,
  author_id    uuid        NOT NULL,
  category_id  uuid,
  title        varchar(300) NOT NULL,
  slug         varchar(300) NOT NULL,
  excerpt      text,
  body         text        NOT NULL,
  cover_image  varchar(500),
  status       varchar(20)  NOT NULL DEFAULT 'draft',
  views        int         NOT NULL DEFAULT 0,
  published_at timestamp,
  created_at   timestamp   NOT NULL DEFAULT now(),
  updated_at   timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE blog_categories (
  id         uuid        NOT NULL,
  org_id     uuid        NOT NULL,
  name       varchar(100) NOT NULL,
  slug       varchar(100) NOT NULL,
  parent_id  uuid,
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE media_files (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  filename    varchar(300) NOT NULL,
  mime_type   varchar(100) NOT NULL,
  size_bytes  bigint      NOT NULL,
  url         varchar(500) NOT NULL,
  alt_text    varchar(255),
  uploaded_by uuid        NOT NULL,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

-- ─── 13. 알림 / 활동 로그 ────────────────────────────────

CREATE TABLE notifications (
  id          uuid        NOT NULL,
  user_id     uuid        NOT NULL,
  type        varchar(50)  NOT NULL,
  title       varchar(200) NOT NULL,
  body        text,
  link        varchar(500),
  is_read     boolean     NOT NULL DEFAULT false,
  read_at     timestamp,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES users (id)
);

CREATE TABLE audit_logs (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  actor_id    uuid,
  actor_type  varchar(30)  NOT NULL DEFAULT 'user',
  action      varchar(100) NOT NULL,
  resource    varchar(100) NOT NULL,
  resource_id uuid,
  old_values  text,
  new_values  text,
  ip_address  varchar(50),
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE webhooks (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  url         varchar(500) NOT NULL,
  events      text        NOT NULL,
  secret      varchar(255),
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE webhook_deliveries (
  id           uuid        NOT NULL,
  webhook_id   uuid        NOT NULL,
  event        varchar(100) NOT NULL,
  payload      text        NOT NULL,
  status_code  int,
  response     text,
  delivered_at timestamp,
  error        text,
  created_at   timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES webhooks (id)
);

-- ─── 14. 설정 / 기타 ──────────────────────────────────────

CREATE TABLE settings (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  key         varchar(100) NOT NULL,
  value       text,
  type        varchar(20)  NOT NULL DEFAULT 'string',
  updated_by  uuid,
  updated_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (org_id, key),
  REFERENCES organizations (id)
);

CREATE TABLE api_keys (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  name        varchar(100) NOT NULL,
  key_hash    varchar(255) NOT NULL,
  prefix      varchar(10)  NOT NULL,
  scopes      text,
  last_used_at timestamp,
  expires_at  timestamp,
  created_by  uuid        NOT NULL,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE feature_flags (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  flag        varchar(100) NOT NULL,
  is_enabled  boolean     NOT NULL DEFAULT false,
  updated_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (org_id, flag),
  REFERENCES organizations (id)
);

CREATE TABLE custom_fields (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  resource    varchar(50)  NOT NULL,
  name        varchar(100) NOT NULL,
  label       varchar(100) NOT NULL,
  type        varchar(30)  NOT NULL DEFAULT 'text',
  options     text,
  is_required boolean     NOT NULL DEFAULT false,
  sort_order  int         NOT NULL DEFAULT 0,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE custom_field_values (
  id              uuid NOT NULL,
  custom_field_id uuid NOT NULL,
  resource_id     uuid NOT NULL,
  value           text,
  PRIMARY KEY (id),
  REFERENCES custom_fields (id)
);

CREATE TABLE tags (
  id       uuid        NOT NULL,
  org_id   uuid        NOT NULL,
  name     varchar(100) NOT NULL,
  color    varchar(7),
  PRIMARY KEY (id),
  UNIQUE (org_id, name),
  REFERENCES organizations (id)
);

CREATE TABLE exports (
  id           uuid        NOT NULL,
  org_id       uuid        NOT NULL,
  type         varchar(50)  NOT NULL,
  status       varchar(20)  NOT NULL DEFAULT 'pending',
  file_url     varchar(500),
  filters      text,
  row_count    int,
  requested_by uuid        NOT NULL,
  started_at   timestamp,
  completed_at timestamp,
  expires_at   timestamp,
  created_at   timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE imports (
  id           uuid        NOT NULL,
  org_id       uuid        NOT NULL,
  type         varchar(50)  NOT NULL,
  status       varchar(20)  NOT NULL DEFAULT 'pending',
  file_url     varchar(500) NOT NULL,
  total_rows   int,
  processed    int         NOT NULL DEFAULT 0,
  success_count int        NOT NULL DEFAULT 0,
  error_count  int         NOT NULL DEFAULT 0,
  error_log    text,
  requested_by uuid        NOT NULL,
  completed_at timestamp,
  created_at   timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE scheduled_jobs (
  id           uuid        NOT NULL,
  org_id       uuid,
  name         varchar(100) NOT NULL,
  type         varchar(50)  NOT NULL,
  cron         varchar(50),
  payload      text,
  status       varchar(20)  NOT NULL DEFAULT 'active',
  last_run_at  timestamp,
  next_run_at  timestamp,
  last_result  text,
  created_at   timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- ─── 15. 포인트 / 멤버십 ─────────────────────────────────

CREATE TABLE loyalty_programs (
  id              uuid          NOT NULL,
  org_id          uuid          NOT NULL,
  name            varchar(200)  NOT NULL,
  earn_rate       decimal(6,4)  NOT NULL DEFAULT 0.01,
  redeem_rate     decimal(6,4)  NOT NULL DEFAULT 0.01,
  min_redeem_pts  int           NOT NULL DEFAULT 100,
  expiry_months   int,
  is_active       boolean       NOT NULL DEFAULT true,
  created_at      timestamp     NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE loyalty_accounts (
  id           uuid NOT NULL,
  customer_id  uuid NOT NULL,
  program_id   uuid NOT NULL,
  points       int  NOT NULL DEFAULT 0,
  lifetime_pts int  NOT NULL DEFAULT 0,
  tier         varchar(30) NOT NULL DEFAULT 'bronze',
  joined_at    timestamp   NOT NULL DEFAULT now(),
  updated_at   timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (customer_id, program_id),
  REFERENCES customers (id),
  REFERENCES loyalty_programs (id)
);

CREATE TABLE loyalty_transactions (
  id          uuid        NOT NULL,
  account_id  uuid        NOT NULL,
  type        varchar(20)  NOT NULL,
  points      int         NOT NULL,
  balance     int         NOT NULL,
  reference_id uuid,
  description text,
  expires_at  timestamp,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES loyalty_accounts (id)
);

-- ─── 16. 애널리틱스 ───────────────────────────────────────

CREATE TABLE page_views (
  id           uuid        NOT NULL,
  org_id       uuid        NOT NULL,
  session_id   varchar(100),
  customer_id  uuid,
  url          varchar(500) NOT NULL,
  referrer     varchar(500),
  device_type  varchar(20),
  country      varchar(10),
  created_at   timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE conversion_events (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  session_id  varchar(100),
  customer_id uuid,
  event_type  varchar(50)  NOT NULL,
  product_id  uuid,
  order_id    uuid,
  value       decimal(12,2),
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE reports (
  id           uuid        NOT NULL,
  org_id       uuid        NOT NULL,
  name         varchar(200) NOT NULL,
  type         varchar(50)  NOT NULL,
  config       text,
  is_scheduled boolean     NOT NULL DEFAULT false,
  schedule     varchar(50),
  last_run_at  timestamp,
  created_by   uuid        NOT NULL,
  created_at   timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE report_snapshots (
  id         uuid      NOT NULL,
  report_id  uuid      NOT NULL,
  data       text      NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES reports (id)
);

-- ─── 17. 장바구니 ─────────────────────────────────────────

CREATE TABLE carts (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  customer_id uuid,
  session_id  varchar(100),
  coupon_code varchar(50),
  note        text,
  created_at  timestamp   NOT NULL DEFAULT now(),
  updated_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id),
  REFERENCES customers (id)
);

CREATE TABLE cart_items (
  id          uuid          NOT NULL,
  cart_id     uuid          NOT NULL,
  variant_id  uuid          NOT NULL,
  quantity    int           NOT NULL DEFAULT 1,
  unit_price  decimal(12,2) NOT NULL,
  added_at    timestamp     NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (cart_id, variant_id),
  REFERENCES carts (id),
  REFERENCES product_variants (id)
);

-- ─── 18. 가격 정책 ────────────────────────────────────────

CREATE TABLE price_lists (
  id          uuid        NOT NULL,
  org_id      uuid        NOT NULL,
  name        varchar(200) NOT NULL,
  currency    varchar(10)  NOT NULL DEFAULT 'KRW',
  is_default  boolean     NOT NULL DEFAULT false,
  valid_from  date,
  valid_until date,
  created_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE price_list_items (
  id            uuid          NOT NULL,
  price_list_id uuid          NOT NULL,
  variant_id    uuid          NOT NULL,
  price         decimal(12,2) NOT NULL,
  compare_price decimal(12,2),
  PRIMARY KEY (id),
  UNIQUE (price_list_id, variant_id),
  REFERENCES price_lists (id),
  REFERENCES product_variants (id)
);

CREATE TABLE discount_rules (
  id           uuid          NOT NULL,
  org_id       uuid          NOT NULL,
  name         varchar(200)  NOT NULL,
  type         varchar(30)   NOT NULL,
  value        decimal(10,2) NOT NULL,
  applies_to   varchar(30)   NOT NULL DEFAULT 'all',
  target_id    uuid,
  min_qty      int,
  min_amount   decimal(12,2),
  starts_at    timestamp,
  ends_at      timestamp,
  is_active    boolean       NOT NULL DEFAULT true,
  created_at   timestamp     NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES organizations (id)
);

CREATE TABLE bundle_products (
  id          uuid          NOT NULL,
  org_id      uuid          NOT NULL,
  name        varchar(200)  NOT NULL,
  sku         varchar(100)  NOT NULL,
  price       decimal(12,2) NOT NULL,
  is_active   boolean       NOT NULL DEFAULT true,
  created_at  timestamp     NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (org_id, sku),
  REFERENCES organizations (id)
);

CREATE TABLE bundle_items (
  id         uuid NOT NULL,
  bundle_id  uuid NOT NULL,
  variant_id uuid NOT NULL,
  quantity   int  NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE (bundle_id, variant_id),
  REFERENCES bundle_products (id),
  REFERENCES product_variants (id)
);

CREATE TABLE affiliate_partners (
  id           uuid          NOT NULL,
  org_id       uuid          NOT NULL,
  name         varchar(200)  NOT NULL,
  email        varchar(255)  NOT NULL,
  code         varchar(50)   NOT NULL,
  commission   decimal(6,4)  NOT NULL DEFAULT 0.05,
  total_earned decimal(14,2) NOT NULL DEFAULT 0,
  status       varchar(20)   NOT NULL DEFAULT 'active',
  created_at   timestamp     NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (org_id, code),
  REFERENCES organizations (id)
);

CREATE TABLE affiliate_clicks (
  id           uuid        NOT NULL,
  partner_id   uuid        NOT NULL,
  ip_address   varchar(50),
  referrer     varchar(500),
  landed_url   varchar(500),
  converted    boolean     NOT NULL DEFAULT false,
  order_id     uuid,
  created_at   timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  REFERENCES affiliate_partners (id)
);
