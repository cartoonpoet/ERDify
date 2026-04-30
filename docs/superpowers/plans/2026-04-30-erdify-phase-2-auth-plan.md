# ERDify Phase 2: Auth, Organization, Project Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ERDify Phase 2 — 회원가입/로그인(JWT), Organization, OrganizationMember, Project, Role 기반 권한 체크를 구현한다.

**Architecture:** 이 계획은 Phase 1에서 만든 NestJS/React 뼈대 위에 실제 인증과 조직/프로젝트 관리 기능을 올린다. DB 스키마는 TypeORM 마이그레이션으로 관리한다.

**New packages/deps:**
- `@nestjs/passport`, `@nestjs/jwt`, `passport`, `passport-jwt`, `bcrypt` (api)
- `@types/passport-jwt`, `@types/bcrypt` (api devDeps)
- `react-router-dom` (web)
- `@tanstack/react-query` 이미 있음

---

## 범위

- Phase 2 구현 항목:
  - TypeORM 엔티티 + 마이그레이션: `users`, `organizations`, `organization_members`, `projects`
  - Auth 모듈: register, login, JWT 발급/검증, JwtAuthGuard
  - Organization 모듈: CRUD, 멤버 초대
  - Project 모듈: CRUD (organization 소속)
  - Role 기반 권한 체크: Owner / Editor / Viewer
  - Frontend: 로그인/회원가입 페이지, 인증 스토어, 보호된 라우트, 조직·프로젝트 사이드바 네비게이션

- 다음 Phase로 분리할 항목:
  - ERD 편집기 자체
  - 실시간 협업(Yjs)
  - Import/Export
  - AI/MCP

---

## 생성/수정 파일 구조

```text
packages/db/src/
  entities/
    user.entity.ts
    organization.entity.ts
    organization-member.entity.ts
    project.entity.ts
  migrations/
    1746000000000-CreateUsersTable.ts
    1746000000001-CreateOrganizationsTable.ts
    1746000000002-CreateOrganizationMembersTable.ts
    1746000000003-CreateProjectsTable.ts
  data-source.ts                # CLI migration runner용 DataSource

apps/api/src/
  modules/
    auth/
      dto/
        register.dto.ts
        login.dto.ts
      entities/                 # (user entity는 @erdify/db에서 import)
      guards/
        jwt-auth.guard.ts
        roles.guard.ts
      strategies/
        jwt.strategy.ts
      decorators/
        current-user.decorator.ts
        roles.decorator.ts
      auth.controller.ts
      auth.service.ts
      auth.module.ts
    organizations/
      dto/
        create-organization.dto.ts
        invite-member.dto.ts
      organizations.controller.ts
      organizations.service.ts
      organizations.module.ts
    projects/
      dto/
        create-project.dto.ts
        update-project.dto.ts
      projects.controller.ts
      projects.service.ts
      projects.module.ts
  common/
    enums/
      role.enum.ts

apps/web/src/
  app/
    App.tsx                     # React Router 추가
    providers/AppProviders.tsx  # BrowserRouter 추가
  pages/
    LoginPage.tsx
    RegisterPage.tsx
    DashboardPage.tsx
  features/
    auth/
      stores/useAuthStore.ts
      hooks/useLogin.ts
      hooks/useRegister.ts
      components/LoginForm.tsx
      components/RegisterForm.tsx
      guards/RequireAuth.tsx
      index.ts
    organizations/
      hooks/useOrganizations.ts
      hooks/useOrganizationProjects.ts
      components/OrganizationSidebar.tsx
      index.ts
  shared/
    api/httpClient.ts           # auth 헤더 interceptor 추가
```

---

## Task 1: DB 엔티티 + 마이그레이션 추가

**Files:**
- Create: `packages/db/src/entities/user.entity.ts`
- Create: `packages/db/src/entities/organization.entity.ts`
- Create: `packages/db/src/entities/organization-member.entity.ts`
- Create: `packages/db/src/entities/project.entity.ts`
- Create: `packages/db/src/entities/index.ts`
- Create: `packages/db/src/migrations/1746000000000-CreateUsersTable.ts`
- Create: `packages/db/src/migrations/1746000000001-CreateOrganizationsTable.ts`
- Create: `packages/db/src/migrations/1746000000002-CreateOrganizationMembersTable.ts`
- Create: `packages/db/src/migrations/1746000000003-CreateProjectsTable.ts`
- Create: `packages/db/src/data-source.ts`
- Modify: `packages/db/src/index.ts`
- Modify: `packages/db/src/typeorm/create-typeorm-options.ts`
- Modify: `packages/db/package.json` (script: migration:run, migration:revert)

- [ ] **Step 1: 실패하는 엔티티 테스트 작성**

Create `packages/db/src/entities/user.entity.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { User } from "./user.entity";

describe("User entity", () => {
  it("has required fields", () => {
    const user = new User();
    user.id = "user_1";
    user.email = "test@example.com";
    user.passwordHash = "hashed";
    user.name = "Test User";

    expect(user.id).toBe("user_1");
    expect(user.email).toBe("test@example.com");
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
pnpm --filter @erdify/db test
```

Expected: `Cannot find module './user.entity'`

- [ ] **Step 3: 엔티티 작성**

Create `packages/db/src/entities/user.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn
} from "typeorm";
import type { OrganizationMember } from "./organization-member.entity";

@Entity("users")
export class User {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ name: "password_hash", length: 255 })
  passwordHash!: string;

  @Column({ length: 100 })
  name!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany("OrganizationMember", "user")
  memberships!: OrganizationMember[];
}
```

Create `packages/db/src/entities/organization.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn
} from "typeorm";
import type { OrganizationMember } from "./organization-member.entity";
import type { Project } from "./project.entity";

@Entity("organizations")
export class Organization {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ name: "owner_id", length: 36 })
  ownerId!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany("OrganizationMember", "organization")
  members!: OrganizationMember[];

  @OneToMany("Project", "organization")
  projects!: Project[];
}
```

Create `packages/db/src/entities/organization-member.entity.ts`:

```ts
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import type { Organization } from "./organization.entity";
import type { User } from "./user.entity";

export type MemberRole = "owner" | "editor" | "viewer";

@Entity("organization_members")
export class OrganizationMember {
  @PrimaryColumn("varchar", { length: 36, name: "organization_id" })
  organizationId!: string;

  @PrimaryColumn("varchar", { length: 36, name: "user_id" })
  userId!: string;

  @Column({ type: "varchar", length: 20, default: "viewer" })
  role!: MemberRole;

  @CreateDateColumn({ name: "joined_at" })
  joinedAt!: Date;

  @ManyToOne("Organization", "members")
  organization!: Organization;

  @ManyToOne("User", "memberships")
  user!: User;
}
```

Create `packages/db/src/entities/project.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn
} from "typeorm";
import type { Organization } from "./organization.entity";

@Entity("projects")
export class Project {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ name: "organization_id", length: 36 })
  organizationId!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @ManyToOne("Organization", "projects")
  organization!: Organization;
}
```

Create `packages/db/src/entities/index.ts`:

```ts
export { OrganizationMember } from "./organization-member.entity";
export type { MemberRole } from "./organization-member.entity";
export { Organization } from "./organization.entity";
export { Project } from "./project.entity";
export { User } from "./user.entity";
```

- [ ] **Step 4: 마이그레이션 작성**

Create `packages/db/src/migrations/1746000000000-CreateUsersTable.ts`:

```ts
import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsersTable1746000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE users`);
  }
}
```

Create `packages/db/src/migrations/1746000000001-CreateOrganizationsTable.ts`:

```ts
import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOrganizationsTable1746000000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE organizations (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        owner_id VARCHAR(36) NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE organizations`);
  }
}
```

Create `packages/db/src/migrations/1746000000002-CreateOrganizationMembersTable.ts`:

```ts
import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOrganizationMembersTable1746000000002 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE organization_members (
        organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL DEFAULT 'viewer',
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (organization_id, user_id)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE organization_members`);
  }
}
```

Create `packages/db/src/migrations/1746000000003-CreateProjectsTable.ts`:

```ts
import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProjectsTable1746000000003 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE projects (
        id VARCHAR(36) PRIMARY KEY,
        organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE projects`);
  }
}
```

Create `packages/db/src/data-source.ts`:

```ts
import "reflect-metadata";
import { DataSource } from "typeorm";
import { OrganizationMember } from "./entities/organization-member.entity";
import { Organization } from "./entities/organization.entity";
import { Project } from "./entities/project.entity";
import { User } from "./entities/user.entity";
import { CreateOrganizationMembersTable1746000000002 } from "./migrations/1746000000002-CreateOrganizationMembersTable";
import { CreateOrganizationsTable1746000000001 } from "./migrations/1746000000001-CreateOrganizationsTable";
import { CreateProjectsTable1746000000003 } from "./migrations/1746000000003-CreateProjectsTable";
import { CreateUsersTable1746000000000 } from "./migrations/1746000000000-CreateUsersTable";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env["DATABASE_URL"] ?? "postgres://erdify:erdify@localhost:5432/erdify",
  synchronize: false,
  migrationsRun: false,
  entities: [User, Organization, OrganizationMember, Project],
  migrations: [
    CreateUsersTable1746000000000,
    CreateOrganizationsTable1746000000001,
    CreateOrganizationMembersTable1746000000002,
    CreateProjectsTable1746000000003
  ]
});
```

Modify `packages/db/src/typeorm/create-typeorm-options.ts` to accept entities:

```ts
import type { DataSourceOptions } from "typeorm";

type PostgresDataSourceOptions = Extract<DataSourceOptions, { type: "postgres" }>;

interface CreateTypeOrmOptionsInput {
  databaseUrl: string;
  entities?: PostgresDataSourceOptions["entities"];
  migrations?: PostgresDataSourceOptions["migrations"];
}

export function createTypeOrmOptions(input: CreateTypeOrmOptionsInput): PostgresDataSourceOptions {
  return {
    type: "postgres",
    url: input.databaseUrl,
    synchronize: false,
    migrationsRun: false,
    entities: input.entities ?? [],
    migrations: input.migrations ?? []
  };
}
```

Modify `packages/db/src/index.ts`:

```ts
export { AppDataSource } from "./data-source";
export { OrganizationMember } from "./entities/organization-member.entity";
export type { MemberRole } from "./entities/organization-member.entity";
export { Organization } from "./entities/organization.entity";
export { Project } from "./entities/project.entity";
export { User } from "./entities/user.entity";
export { createTypeOrmOptions } from "./typeorm/create-typeorm-options";
```

Modify `packages/db/package.json` — add migration scripts and `reflect-metadata` dep:

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "eslint src",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "migration:run": "tsx src/data-source.ts && typeorm migration:run -d dist/data-source.js",
    "migration:revert": "typeorm migration:revert -d dist/data-source.js"
  },
  "dependencies": {
    "reflect-metadata": "^0.2.2",
    "typeorm": "^0.3.22"
  },
  "devDependencies": {
    "@erdify/config-typescript": "workspace:*",
    "tsx": "^4.19.4",
    "vitest": "^3.1.2"
  }
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm install
pnpm --filter @erdify/db test
pnpm --filter @erdify/db typecheck
```

Expected: `2 passed`

- [ ] **Step 6: 커밋**

```bash
git add packages/db pnpm-lock.yaml
git commit -m "feat(db): add user/org/project entities and migrations"
```

---

## Task 2: Auth 모듈 구현 (register, login, JWT)

**Files:**
- Modify: `apps/api/package.json` (add auth deps)
- Create: `apps/api/src/common/enums/role.enum.ts`
- Create: `apps/api/src/modules/auth/dto/register.dto.ts`
- Create: `apps/api/src/modules/auth/dto/login.dto.ts`
- Create: `apps/api/src/modules/auth/strategies/jwt.strategy.ts`
- Create: `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/modules/auth/guards/roles.guard.ts`
- Create: `apps/api/src/modules/auth/decorators/current-user.decorator.ts`
- Create: `apps/api/src/modules/auth/decorators/roles.decorator.ts`
- Create: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/auth/auth.service.spec.ts`
- Create: `apps/api/src/modules/auth/auth.controller.ts`
- Create: `apps/api/src/modules/auth/auth.module.ts`
- Modify: `apps/api/src/modules/database/database.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: 실패하는 auth 서비스 테스트 작성**

Create `apps/api/src/modules/auth/auth.service.spec.ts`:

```ts
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "@erdify/db";
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service";

const mockUserRepo = {
  findOne: vi.fn(),
  save: vi.fn()
};

const mockJwtService = {
  sign: vi.fn().mockReturnValue("test.jwt.token")
};

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: JwtService, useValue: mockJwtService }
      ]
    }).compile();

    service = module.get(AuthService);
  });

  it("register returns access_token", async () => {
    mockUserRepo.findOne.mockResolvedValueOnce(null);
    mockUserRepo.save.mockImplementationOnce((u: User) => Promise.resolve(u));

    const result = await service.register({
      email: "test@example.com",
      password: "password123",
      name: "Test User"
    });

    expect(result).toHaveProperty("access_token");
  });

  it("register throws if email already exists", async () => {
    mockUserRepo.findOne.mockResolvedValueOnce({ id: "existing" });

    await expect(
      service.register({
        email: "existing@example.com",
        password: "password123",
        name: "Existing"
      })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
pnpm --filter @erdify/api test
```

Expected: `Cannot find module './auth.service'`

- [ ] **Step 3: auth deps 추가**

Modify `apps/api/package.json` — add to dependencies:

```json
"@nestjs/jwt": "^11.0.0",
"@nestjs/passport": "^11.0.0",
"bcrypt": "^5.1.1",
"passport": "^0.7.0",
"passport-jwt": "^4.0.1"
```

Add to devDependencies:

```json
"@types/bcrypt": "^5.0.2",
"@types/passport-jwt": "^4.0.1"
```

- [ ] **Step 4: Role enum 작성**

Create `apps/api/src/common/enums/role.enum.ts`:

```ts
export enum Role {
  Owner = "owner",
  Editor = "editor",
  Viewer = "viewer"
}
```

- [ ] **Step 5: Auth DTO, strategy, guard, decorator 작성**

Create `apps/api/src/modules/auth/dto/register.dto.ts`:

```ts
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
```

Create `apps/api/src/modules/auth/dto/login.dto.ts`:

```ts
import { IsEmail, IsString } from "class-validator";

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
```

Create `apps/api/src/modules/auth/strategies/jwt.strategy.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET") ?? "dev-secret"
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
```

Create `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
```

Create `apps/api/src/modules/auth/guards/roles.guard.ts`:

```ts
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "../../common/enums/role.enum";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: { role?: Role } }>();
    return required.includes(user.role as Role);
  }
}
```

Create `apps/api/src/modules/auth/decorators/current-user.decorator.ts`:

```ts
import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { JwtPayload } from "../strategies/jwt.strategy";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    return request.user;
  }
);
```

Create `apps/api/src/modules/auth/decorators/roles.decorator.ts`:

```ts
import { SetMetadata } from "@nestjs/common";
import type { Role } from "../../common/enums/role.enum";

export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 6: AuthService 구현**

Create `apps/api/src/modules/auth/auth.service.ts`:

```ts
import { User } from "@erdify/db";
import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { randomUUID } from "crypto";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService
  ) {}

  async register(dto: RegisterDto): Promise<{ access_token: string }> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("Email already registered.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      id: randomUUID(),
      email: dto.email,
      passwordHash,
      name: dto.name
    });
    await this.userRepo.save(user);

    return this.issueToken(user);
  }

  async login(dto: LoginDto): Promise<{ access_token: string }> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    return this.issueToken(user);
  }

  private issueToken(user: User): { access_token: string } {
    const payload = { sub: user.id, email: user.email };
    return { access_token: this.jwtService.sign(payload) };
  }
}
```

- [ ] **Step 7: AuthController + AuthModule 작성**

Create `apps/api/src/modules/auth/auth.controller.ts`:

```ts
import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "./decorators/current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AuthService } from "./auth.service";
import type { JwtPayload } from "./strategies/jwt.strategy";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto): Promise<{ access_token: string }> {
    return this.authService.register(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto): Promise<{ access_token: string }> {
    return this.authService.login(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload): JwtPayload {
    return user;
  }
}
```

Create `apps/api/src/modules/auth/auth.module.ts`:

```ts
import { User } from "@erdify/db";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET") ?? "dev-secret",
        signOptions: { expiresIn: "7d" }
      })
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule]
})
export class AuthModule {}
```

- [ ] **Step 8: DatabaseModule에 엔티티 등록**

Modify `apps/api/src/modules/database/database.module.ts`:

```ts
import { OrganizationMember, Organization, Project, User, createTypeOrmOptions } from "@erdify/db";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createTypeOrmOptions({
          databaseUrl:
            configService.get<string>("DATABASE_URL") ??
            "postgres://erdify:erdify@localhost:5432/erdify",
          entities: [User, Organization, OrganizationMember, Project]
        })
    })
  ]
})
export class DatabaseModule {}
```

Modify `apps/api/src/app.module.ts` — add AuthModule:

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { DatabaseModule } from "./modules/database/database.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    HealthModule
  ]
})
export class AppModule {}
```

- [ ] **Step 9: 테스트 통과 확인**

```bash
pnpm install
pnpm --filter @erdify/api test
pnpm --filter @erdify/api typecheck
```

Expected: `3 passed` (health + 2 auth)

- [ ] **Step 10: 커밋**

```bash
git add apps/api packages/db pnpm-lock.yaml
git commit -m "feat(auth): add register/login/JWT module"
```

---

## Task 3: Organization 모듈 구현

**Files:**
- Create: `apps/api/src/modules/organizations/dto/create-organization.dto.ts`
- Create: `apps/api/src/modules/organizations/dto/invite-member.dto.ts`
- Create: `apps/api/src/modules/organizations/organizations.service.ts`
- Create: `apps/api/src/modules/organizations/organizations.service.spec.ts`
- Create: `apps/api/src/modules/organizations/organizations.controller.ts`
- Create: `apps/api/src/modules/organizations/organizations.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: 실패하는 organizations 서비스 테스트 작성**

Create `apps/api/src/modules/organizations/organizations.service.spec.ts`:

```ts
import { Organization, OrganizationMember, User } from "@erdify/db";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { describe, expect, it, vi } from "vitest";
import { OrganizationsService } from "./organizations.service";

const mockOrgRepo = { create: vi.fn(), save: vi.fn(), find: vi.fn() };
const mockMemberRepo = { create: vi.fn(), save: vi.fn(), findOne: vi.fn() };
const mockUserRepo = { findOne: vi.fn() };

describe("OrganizationsService", () => {
  let service: OrganizationsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: getRepositoryToken(Organization), useValue: mockOrgRepo },
        { provide: getRepositoryToken(OrganizationMember), useValue: mockMemberRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo }
      ]
    }).compile();

    service = module.get(OrganizationsService);
  });

  it("creates an organization and sets owner as member", async () => {
    const org = { id: "org_1", name: "Test Org", ownerId: "user_1" };
    mockOrgRepo.create.mockReturnValueOnce(org);
    mockOrgRepo.save.mockResolvedValueOnce(org);
    mockMemberRepo.create.mockReturnValueOnce({ organizationId: "org_1", userId: "user_1", role: "owner" });
    mockMemberRepo.save.mockResolvedValueOnce({});

    const result = await service.create({ name: "Test Org" }, "user_1");

    expect(result.name).toBe("Test Org");
    expect(mockMemberRepo.save).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
pnpm --filter @erdify/api test
```

Expected: `Cannot find module './organizations.service'`

- [ ] **Step 3: Organizations 구현**

Create `apps/api/src/modules/organizations/dto/create-organization.dto.ts`:

```ts
import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateOrganizationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
```

Create `apps/api/src/modules/organizations/dto/invite-member.dto.ts`:

```ts
import { IsEmail, IsIn } from "class-validator";
import type { MemberRole } from "@erdify/db";

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsIn(["editor", "viewer"])
  role!: Exclude<MemberRole, "owner">;
}
```

Create `apps/api/src/modules/organizations/organizations.service.ts`:

```ts
import { Organization, OrganizationMember, User } from "@erdify/db";
import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { Repository } from "typeorm";
import type { CreateOrganizationDto } from "./dto/create-organization.dto";
import type { InviteMemberDto } from "./dto/invite-member.dto";

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>
  ) {}

  async create(dto: CreateOrganizationDto, userId: string): Promise<Organization> {
    const org = this.orgRepo.create({
      id: randomUUID(),
      name: dto.name,
      ownerId: userId
    });
    await this.orgRepo.save(org);

    const member = this.memberRepo.create({
      organizationId: org.id,
      userId,
      role: "owner"
    });
    await this.memberRepo.save(member);

    return org;
  }

  async findAllForUser(userId: string): Promise<Organization[]> {
    return this.orgRepo
      .createQueryBuilder("org")
      .innerJoin("org.members", "member", "member.user_id = :userId", { userId })
      .getMany();
  }

  async inviteMember(
    organizationId: string,
    dto: InviteMemberDto,
    requesterId: string
  ): Promise<OrganizationMember> {
    await this.assertOwner(organizationId, requesterId);

    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new NotFoundException("User not found.");

    const member = this.memberRepo.create({
      organizationId,
      userId: user.id,
      role: dto.role
    });
    return this.memberRepo.save(member);
  }

  private async assertOwner(organizationId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { organizationId, userId, role: "owner" }
    });
    if (!member) throw new ForbiddenException("Only owners can perform this action.");
  }
}
```

Create `apps/api/src/modules/organizations/organizations.controller.ts`:

```ts
import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/strategies/jwt.strategy";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.organizationsService.create(dto, user.sub);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.organizationsService.findAllForUser(user.sub);
  }

  @Post(":organizationId/members")
  inviteMember(
    @Param("organizationId") organizationId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.organizationsService.inviteMember(organizationId, dto, user.sub);
  }
}
```

Create `apps/api/src/modules/organizations/organizations.module.ts`:

```ts
import { OrganizationMember, Organization, User } from "@erdify/db";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";

@Module({
  imports: [TypeOrmModule.forFeature([Organization, OrganizationMember, User])],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService]
})
export class OrganizationsModule {}
```

Modify `apps/api/src/app.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { DatabaseModule } from "./modules/database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    OrganizationsModule,
    HealthModule
  ]
})
export class AppModule {}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm --filter @erdify/api test
pnpm --filter @erdify/api typecheck
```

Expected: `4 passed`

- [ ] **Step 5: 커밋**

```bash
git add apps/api
git commit -m "feat(organizations): add org CRUD and member invite"
```

---

## Task 4: Project 모듈 구현

**Files:**
- Create: `apps/api/src/modules/projects/dto/create-project.dto.ts`
- Create: `apps/api/src/modules/projects/dto/update-project.dto.ts`
- Create: `apps/api/src/modules/projects/projects.service.ts`
- Create: `apps/api/src/modules/projects/projects.service.spec.ts`
- Create: `apps/api/src/modules/projects/projects.controller.ts`
- Create: `apps/api/src/modules/projects/projects.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: 실패하는 projects 서비스 테스트 작성**

Create `apps/api/src/modules/projects/projects.service.spec.ts`:

```ts
import { OrganizationMember, Project } from "@erdify/db";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { describe, expect, it, vi } from "vitest";
import { ProjectsService } from "./projects.service";

const mockProjectRepo = { create: vi.fn(), save: vi.fn(), find: vi.fn() };
const mockMemberRepo = { findOne: vi.fn() };

describe("ProjectsService", () => {
  let service: ProjectsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getRepositoryToken(Project), useValue: mockProjectRepo },
        { provide: getRepositoryToken(OrganizationMember), useValue: mockMemberRepo }
      ]
    }).compile();

    service = module.get(ProjectsService);
  });

  it("creates a project for org member", async () => {
    mockMemberRepo.findOne.mockResolvedValueOnce({ role: "owner" });
    const project = { id: "proj_1", name: "Legal ERD", organizationId: "org_1" };
    mockProjectRepo.create.mockReturnValueOnce(project);
    mockProjectRepo.save.mockResolvedValueOnce(project);

    const result = await service.create("org_1", { name: "Legal ERD", description: null }, "user_1");

    expect(result.name).toBe("Legal ERD");
  });

  it("throws if user is not a member", async () => {
    mockMemberRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      service.create("org_1", { name: "Legal ERD", description: null }, "outsider")
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
pnpm --filter @erdify/api test
```

- [ ] **Step 3: Projects 구현**

Create `apps/api/src/modules/projects/dto/create-project.dto.ts`:

```ts
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  description!: string | null;
}
```

Create `apps/api/src/modules/projects/dto/update-project.dto.ts`:

```ts
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}
```

Create `apps/api/src/modules/projects/projects.service.ts`:

```ts
import { OrganizationMember, Project } from "@erdify/db";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { Repository } from "typeorm";
import type { CreateProjectDto } from "./dto/create-project.dto";

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>
  ) {}

  async create(
    organizationId: string,
    dto: CreateProjectDto,
    userId: string
  ): Promise<Project> {
    await this.assertMember(organizationId, userId);

    const project = this.projectRepo.create({
      id: randomUUID(),
      organizationId,
      name: dto.name,
      description: dto.description ?? null
    });

    return this.projectRepo.save(project);
  }

  async findAllForOrg(organizationId: string, userId: string): Promise<Project[]> {
    await this.assertMember(organizationId, userId);
    return this.projectRepo.find({ where: { organizationId } });
  }

  private async assertMember(organizationId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { organizationId, userId } });
    if (!member) throw new ForbiddenException("Not a member of this organization.");
  }
}
```

Create `apps/api/src/modules/projects/projects.controller.ts`:

```ts
import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/strategies/jwt.strategy";
import { CreateProjectDto } from "./dto/create-project.dto";
import { ProjectsService } from "./projects.service";

@Controller("organizations/:organizationId/projects")
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(
    @Param("organizationId") organizationId: string,
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.projectsService.create(organizationId, dto, user.sub);
  }

  @Get()
  findAll(
    @Param("organizationId") organizationId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.projectsService.findAllForOrg(organizationId, user.sub);
  }
}
```

Create `apps/api/src/modules/projects/projects.module.ts`:

```ts
import { OrganizationMember, Project } from "@erdify/db";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";

@Module({
  imports: [TypeOrmModule.forFeature([Project, OrganizationMember])],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService]
})
export class ProjectsModule {}
```

Modify `apps/api/src/app.module.ts` — add ProjectsModule:

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { DatabaseModule } from "./modules/database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { ProjectsModule } from "./modules/projects/projects.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    OrganizationsModule,
    ProjectsModule,
    HealthModule
  ]
})
export class AppModule {}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm --filter @erdify/api test
pnpm --filter @erdify/api typecheck
```

Expected: `6 passed`

- [ ] **Step 5: 커밋**

```bash
git add apps/api
git commit -m "feat(projects): add project CRUD with org membership check"
```

---

## Task 5: Frontend — Auth 스토어 + 로그인/회원가입 페이지

**Files:**
- Modify: `apps/web/package.json` (add react-router-dom)
- Create: `apps/web/src/features/auth/stores/useAuthStore.ts`
- Create: `apps/web/src/features/auth/hooks/useLogin.ts`
- Create: `apps/web/src/features/auth/hooks/useRegister.ts`
- Create: `apps/web/src/features/auth/components/LoginForm.tsx`
- Create: `apps/web/src/features/auth/components/LoginForm.test.tsx`
- Create: `apps/web/src/features/auth/components/RegisterForm.tsx`
- Create: `apps/web/src/features/auth/guards/RequireAuth.tsx`
- Create: `apps/web/src/features/auth/index.ts`
- Create: `apps/web/src/pages/LoginPage.tsx`
- Create: `apps/web/src/pages/RegisterPage.tsx`
- Create: `apps/web/src/pages/DashboardPage.tsx`
- Modify: `apps/web/src/app/App.tsx`
- Modify: `apps/web/src/app/providers/AppProviders.tsx`
- Modify: `apps/web/src/shared/api/httpClient.ts`

- [ ] **Step 1: 실패하는 LoginForm 테스트 작성**

Create `apps/web/src/features/auth/components/LoginForm.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  it("renders email and password fields", () => {
    render(<LoginForm onSubmit={vi.fn()} isLoading={false} />);

    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
pnpm --filter @erdify/web test
```

- [ ] **Step 3: react-router-dom 추가**

Modify `apps/web/package.json` — add to dependencies:

```json
"react-router-dom": "^7.6.0"
```

- [ ] **Step 4: Auth 스토어와 hooks 구현**

Modify `apps/web/src/shared/api/httpClient.ts`:

```ts
import axios from "axios";

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000",
  timeout: 10_000
});

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});
```

Create `apps/web/src/features/auth/stores/useAuthStore.ts`:

```ts
import { create } from "zustand";

interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  setAuth: (token: string, userId: string, email: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("access_token"),
  userId: null,
  email: null,
  setAuth: (token, userId, email) => {
    localStorage.setItem("access_token", token);
    set({ token, userId, email });
  },
  clearAuth: () => {
    localStorage.removeItem("access_token");
    set({ token: null, userId: null, email: null });
  }
}));
```

Create `apps/web/src/features/auth/hooks/useLogin.ts`:

```ts
import { useMutation } from "@tanstack/react-query";
import { httpClient } from "@/shared/api/httpClient";
import { useAuthStore } from "../stores/useAuthStore";

interface LoginInput {
  email: string;
  password: string;
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await httpClient.post<{ access_token: string }>("/auth/login", input);
      return data;
    },
    onSuccess: (data) => {
      const payload = parseJwt(data.access_token);
      setAuth(data.access_token, payload.sub, payload.email);
    }
  });
}

function parseJwt(token: string): { sub: string; email: string } {
  const base64 = token.split(".")[1] ?? "";
  return JSON.parse(atob(base64)) as { sub: string; email: string };
}
```

Create `apps/web/src/features/auth/hooks/useRegister.ts`:

```ts
import { useMutation } from "@tanstack/react-query";
import { httpClient } from "@/shared/api/httpClient";
import { useAuthStore } from "../stores/useAuthStore";

interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await httpClient.post<{ access_token: string }>("/auth/register", input);
      return data;
    },
    onSuccess: (data) => {
      const payload = parseJwt(data.access_token);
      setAuth(data.access_token, payload.sub, payload.email);
    }
  });
}

function parseJwt(token: string): { sub: string; email: string } {
  const base64 = token.split(".")[1] ?? "";
  return JSON.parse(atob(base64)) as { sub: string; email: string };
}
```

- [ ] **Step 5: LoginForm, RegisterForm, RequireAuth 컴포넌트 작성**

Create `apps/web/src/features/auth/components/LoginForm.tsx`:

```tsx
import { type FormEvent, useState } from "react";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
  isLoading: boolean;
  error?: string;
}

export function LoginForm({ onSubmit, isLoading, error }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(email, password);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label htmlFor="email">이메일</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <label htmlFor="password">비밀번호</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit" disabled={isLoading}>
        로그인
      </button>
    </form>
  );
}
```

Create `apps/web/src/features/auth/components/RegisterForm.tsx`:

```tsx
import { type FormEvent, useState } from "react";

interface RegisterFormProps {
  onSubmit: (name: string, email: string, password: string) => void;
  isLoading: boolean;
  error?: string;
}

export function RegisterForm({ onSubmit, isLoading, error }: RegisterFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(name, email, password);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label htmlFor="name">이름</label>
      <input
        id="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <label htmlFor="email">이메일</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <label htmlFor="password">비밀번호</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={8}
        required
      />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit" disabled={isLoading}>
        회원가입
      </button>
    </form>
  );
}
```

Create `apps/web/src/features/auth/guards/RequireAuth.tsx`:

```tsx
import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";

export function RequireAuth({ children }: PropsWithChildren) {
  const token = useAuthStore((s) => s.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

Create `apps/web/src/features/auth/index.ts`:

```ts
export { LoginForm } from "./components/LoginForm";
export { RegisterForm } from "./components/RegisterForm";
export { RequireAuth } from "./guards/RequireAuth";
export { useAuthStore } from "./stores/useAuthStore";
export { useLogin } from "./hooks/useLogin";
export { useRegister } from "./hooks/useRegister";
```

- [ ] **Step 6: 페이지 작성**

Create `apps/web/src/pages/LoginPage.tsx`:

```tsx
import { useNavigate, Link } from "react-router-dom";
import { LoginForm } from "@/features/auth";
import { useLogin } from "@/features/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();

  function handleSubmit(email: string, password: string) {
    login.mutate(
      { email, password },
      { onSuccess: () => navigate("/") }
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 24 }}>
      <h1>ERDify 로그인</h1>
      <LoginForm
        onSubmit={handleSubmit}
        isLoading={login.isPending}
        error={login.error?.message}
      />
      <p>
        계정이 없으신가요? <Link to="/register">회원가입</Link>
      </p>
    </div>
  );
}
```

Create `apps/web/src/pages/RegisterPage.tsx`:

```tsx
import { useNavigate, Link } from "react-router-dom";
import { RegisterForm } from "@/features/auth";
import { useRegister } from "@/features/auth";

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useRegister();

  function handleSubmit(name: string, email: string, password: string) {
    register.mutate(
      { name, email, password },
      { onSuccess: () => navigate("/") }
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 24 }}>
      <h1>ERDify 회원가입</h1>
      <RegisterForm
        onSubmit={handleSubmit}
        isLoading={register.isPending}
        error={register.error?.message}
      />
      <p>
        이미 계정이 있으신가요? <Link to="/login">로그인</Link>
      </p>
    </div>
  );
}
```

Create `apps/web/src/pages/DashboardPage.tsx`:

```tsx
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth";
import { brand, content, emptyState, main, shell, sidebar, topbar } from "@/app/app.css";
import { Button, lightThemeClass } from "@lawkit/ui";
import "@lawkit/ui/style.css";

export function DashboardPage() {
  const { email, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    clearAuth();
    navigate("/login");
  }

  return (
    <div className={`${lightThemeClass} ${shell}`}>
      <header className={topbar}>
        <div className={brand}>ERDify</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14, color: "#5a6a85" }}>{email}</span>
          <Button color="secondary" size="small" onClick={handleLogout}>
            로그아웃
          </Button>
          <Button color="primary" size="medium">
            새 ERD
          </Button>
        </div>
      </header>
      <div className={content}>
        <aside className={sidebar}>프로젝트</aside>
        <main className={main}>
          <section className={emptyState}>프로젝트를 선택하면 ERD 목록이 표시됩니다.</section>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: App.tsx와 AppProviders.tsx를 React Router로 업데이트**

Modify `apps/web/src/app/App.tsx`:

```tsx
import { Route, Routes } from "react-router-dom";
import { RequireAuth } from "@/features/auth";
import { DashboardPage } from "@/pages/DashboardPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
```

Modify `apps/web/src/app/providers/AppProviders.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useState } from "react";
import { BrowserRouter } from "react-router-dom";

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1
          }
        }
      })
  );

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 8: App.test.tsx 업데이트**

Modify `apps/web/src/app/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppProviders } from "./providers/AppProviders";
import { App } from "./App";

describe("App", () => {
  it("redirects to login when not authenticated", () => {
    localStorage.removeItem("access_token");
    render(
      <AppProviders>
        <App />
      </AppProviders>
    );

    expect(screen.getByText("ERDify 로그인")).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: 테스트 통과 확인**

```bash
pnpm install
pnpm --filter @erdify/web test
pnpm --filter @erdify/web typecheck
pnpm --filter @erdify/web build
```

Expected: `2 passed` (App + LoginForm)

- [ ] **Step 10: 커밋**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): add auth pages and protected routes"
```

---

## Task 6: 전체 품질 게이트 통과 + Phase 2 마무리

- [ ] **Step 1: 전체 품질 게이트**

```bash
pnpm turbo run test typecheck build
```

Expected: 모든 tasks 성공

- [ ] **Step 2: 최종 커밋**

```bash
git add .
git commit -m "chore: phase 2 quality gate pass"
```

---

## Self-Review

Spec coverage for Phase 2:
- Register/login JWT: Task 2
- Organization CRUD + member: Task 3
- Project CRUD: Task 4
- Role-based permission (owner check): Task 3, 4
- TypeORM entities + migrations: Task 1
- Frontend auth store + protected routes: Task 5
- Login/Register pages: Task 5

Red-flag scan:
- bcrypt salt rounds: 12 (production-appropriate)
- JWT secret from ConfigService with dev fallback
- No `synchronize: true` in production path
- Role check is server-side, not trust-the-client

## Execution Choice

Plan saved to `docs/superpowers/plans/2026-04-30-erdify-phase-2-auth-plan.md`.

Two execution options:
1. **Subagent-Driven (recommended)** — 태스크별로 fresh subagent dispatch
2. **Inline Execution** — 현재 세션에서 `executing-plans`로 체크포인트 단위 실행
