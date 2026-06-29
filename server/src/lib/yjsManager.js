import * as Y from "yjs";
import { prisma } from "./prisma.js";
import { logger } from "../config/index.js";

const docs = new Map();

export class YjsManager {
  getDoc(fileId) {
    let doc = docs.get(fileId);
    if (!doc) {
      doc = new Y.Doc({ guid: fileId });
      docs.set(fileId, doc);

      doc.on("update", (update, origin) => {
        if (origin !== "load") {
          this._persistUpdate(fileId, update);
        }
      });

      logger.debug("Yjs document created", { fileId });
    }
    return doc;
  }

  getOrCreateDoc(fileId, initialContent = "") {
    const doc = this.getDoc(fileId);

    if (!doc.getText("content").toString()) {
      doc.transact(() => {
        doc.getText("content").insert(0, initialContent);
      }, "load");
    }

    return doc;
  }

  async loadFromDb(fileId) {
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file) return null;

    const doc = this.getDoc(fileId);

    if (file.content && !doc.getText("content").toString()) {
      doc.transact(() => {
        doc.getText("content").insert(0, file.content);
      }, "load");
    }

    return doc;
  }

  async saveToDb(fileId) {
    const doc = docs.get(fileId);
    if (!doc) return;

    const content = doc.getText("content").toString();
    await prisma.file.update({
      where: { id: fileId },
      data: { content, size: content.length },
    });

    logger.debug("Yjs document saved to DB", { fileId });
  }

  async _persistUpdate(fileId, update) {
    try {
      const doc = docs.get(fileId);
      if (!doc) return;

      const content = doc.getText("content").toString();
      await prisma.file.update({
        where: { id: fileId },
        data: { content, size: content.length },
      });
    } catch (error) {
      logger.error("Failed to persist Yjs update", { fileId, error: error.message });
    }
  }

  getStateVector(fileId) {
    const doc = docs.get(fileId);
    if (!doc) return null;
    return Y.encodeStateAsUpdate(doc);
  }

  applyUpdate(fileId, update) {
    const doc = docs.get(fileId);
    if (!doc) return;
    Y.applyUpdate(doc, update);
  }

  encodeStateAsUpdate(fileId) {
    const doc = docs.get(fileId);
    if (!doc) return null;
    return Y.encodeStateAsUpdate(doc);
  }

  computeMissingUpdates(fileId, encodedSv) {
    const doc = docs.get(fileId);
    if (!doc) return null;
    const sv = Y.decodeStateVector(encodedSv);
    return Y.encodeStateAsUpdate(doc, sv);
  }

  removeDoc(fileId) {
    const doc = docs.get(fileId);
    if (doc) {
      doc.destroy();
      docs.delete(fileId);
      logger.debug("Yjs document destroyed", { fileId });
    }
  }

  getActiveDocs() {
    return Array.from(docs.keys());
  }
}

export const yjsManager = new YjsManager();
