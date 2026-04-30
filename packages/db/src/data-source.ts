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
