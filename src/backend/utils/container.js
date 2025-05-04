class Container {
  constructor() {
    this.services = new Map();
    this.instances = new Map();
  }

  register(name, service, dependencies = []) {
    this.services.set(name, { service, dependencies });
  }

  get(name) {
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }

    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }

    const dependencies = service.dependencies.map(dep => this.get(dep));
    const instance = new service.service(...dependencies);
    this.instances.set(name, instance);
    return instance;
  }
}

// Create singleton instance
const container = new Container();

module.exports = container; 