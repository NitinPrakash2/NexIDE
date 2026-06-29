-- CreateTable
CREATE TABLE "containers" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "image" TEXT NOT NULL DEFAULT 'node:18-alpine',
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "docker_id" TEXT,
    "assigned_port" INTEGER,
    "container_port" INTEGER DEFAULT 3000,
    "cpu_limit" TEXT,
    "memory_limit" TEXT,
    "env_vars" JSONB,
    "entrypoint" TEXT,
    "command" TEXT,
    "error_log" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "containers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "containers_docker_id_key" ON "containers"("docker_id");

-- CreateIndex
CREATE INDEX "containers_project_id_idx" ON "containers"("project_id");

-- CreateIndex
CREATE INDEX "containers_status_idx" ON "containers"("status");

-- AddForeignKey
ALTER TABLE "containers" ADD CONSTRAINT "containers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
