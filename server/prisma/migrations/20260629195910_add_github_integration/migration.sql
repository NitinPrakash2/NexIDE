-- AlterEnum
ALTER TYPE "Provider" ADD VALUE 'GITHUB';

-- CreateTable
CREATE TABLE "github_repos" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "repo_url" TEXT NOT NULL,
    "repo_full_name" TEXT NOT NULL,
    "default_branch" TEXT NOT NULL DEFAULT 'main',
    "github_installation_id" TEXT,
    "webhook_secret" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_repos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "github_repos_project_id_key" ON "github_repos"("project_id");

-- CreateIndex
CREATE INDEX "github_repos_user_id_idx" ON "github_repos"("user_id");

-- CreateIndex
CREATE INDEX "github_repos_repo_full_name_idx" ON "github_repos"("repo_full_name");

-- AddForeignKey
ALTER TABLE "github_repos" ADD CONSTRAINT "github_repos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_repos" ADD CONSTRAINT "github_repos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
