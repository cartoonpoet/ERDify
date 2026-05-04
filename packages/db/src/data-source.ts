import "reflect-metadata";
import { DataSource } from "typeorm";
import { ApiKey } from "./entities/api-key.entity";
import { Diagram } from "./entities/diagram.entity";
import { DiagramVersion } from "./entities/diagram-version.entity";
import { OrganizationMember } from "./entities/organization-member.entity";
import { Organization } from "./entities/organization.entity";
import { Project } from "./entities/project.entity";
import { User } from "./entities/user.entity";
import { CreateUsersTable1746000000000 } from "./migrations/1746000000000-CreateUsersTable";
import { CreateOrganizationsTable1746000000001 } from "./migrations/1746000000001-CreateOrganizationsTable";
import { CreateOrganizationMembersTable1746000000002 } from "./migrations/1746000000002-CreateOrganizationMembersTable";
import { CreateProjectsTable1746000000003 } from "./migrations/1746000000003-CreateProjectsTable";
import { CreateDiagramsTable1746000000004 } from "./migrations/1746000000004-CreateDiagramsTable";
import { CreateDiagramVersionsTable1746000000005 } from "./migrations/1746000000005-CreateDiagramVersionsTable";
import { AddCreatedByToDiagrams1746000000006 } from "./migrations/1746000000006-AddCreatedByToDiagrams";
import { AddAvatarUrlToUsers1746000000007 } from "./migrations/1746000000007-AddAvatarUrlToUsers";
import { AddShareTokenToDiagrams1746000000008 } from "./migrations/1746000000008-AddShareTokenToDiagrams";
import { CreateApiKeysTable1746000000009 } from "./migrations/1746000000009-CreateApiKeysTable";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env["DATABASE_URL"] ?? "postgres://erdify:erdify@localhost:5432/erdify",
  synchronize: false,
  migrationsRun: false,
  entities: [User, Organization, OrganizationMember, Project, Diagram, DiagramVersion, ApiKey],
  migrations: [
    CreateUsersTable1746000000000,
    CreateOrganizationsTable1746000000001,
    CreateOrganizationMembersTable1746000000002,
    CreateProjectsTable1746000000003,
    CreateDiagramsTable1746000000004,
    CreateDiagramVersionsTable1746000000005,
    AddCreatedByToDiagrams1746000000006,
    AddAvatarUrlToUsers1746000000007,
    AddShareTokenToDiagrams1746000000008,
    CreateApiKeysTable1746000000009,
  ]
});
