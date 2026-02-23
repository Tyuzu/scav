export const UploadStore = {
    uploads: [],
    controllers: {},
  
    update(id, changes) {
      this.uploads = this.uploads.map(u => u.id === id ? { ...u, ...changes } : u);
    },
  
    remove(id) {
      if (this.controllers[id]) this.controllers[id].abort();
      delete this.controllers[id];
      this.uploads = this.uploads.filter(u => u.id !== id);
    },
  
    clear() {
      this.uploads = [];
      this.controllers = {};
    }
  };
  