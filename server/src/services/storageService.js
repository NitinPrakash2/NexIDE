export class StorageService {
  constructor(provider) {
    this.provider = provider;
  }

  async upload(buffer, filename, mimetype) {
    return this.provider.upload(buffer, filename, mimetype);
  }

  async delete(key) {
    return this.provider.delete(key);
  }

  async getUrl(key) {
    return this.provider.getUrl(key);
  }
}

export class LocalStorageProvider {
  async upload(buffer, filename, mimetype) {
    const key = `avatars/${Date.now()}-${filename}`;
    return { key, url: `/uploads/${key}` };
  }

  async delete(key) {
    return true;
  }

  async getUrl(key) {
    return `/uploads/${key}`;
  }
}

export class CloudStorageProvider {
  constructor(config) {
    this.config = config;
  }

  async upload(buffer, filename, mimetype) {
    throw new Error("Cloud storage not implemented. Integrate Cloudinary, S3, etc.");
  }

  async delete(key) {
    throw new Error("Cloud storage not implemented.");
  }

  async getUrl(key) {
    throw new Error("Cloud storage not implemented.");
  }
}

let storageInstance = null;

export const getStorageService = () => {
  if (!storageInstance) {
    const provider = process.env.NODE_ENV === "production"
      ? new CloudStorageProvider()
      : new LocalStorageProvider();
    storageInstance = new StorageService(provider);
  }
  return storageInstance;
};
