import { Page } from "puppeteer-core";

interface ResolvedHolder {
  __resolver?: () => void;
}

export class PuppeteerNetworkMonitor {
  promisees: Promise<void>[] = [];
  resourceType = ["image"];
  pendingRequests = new Set();
  finishedRequestsWithSuccess = new Set();
  finishedRequestsWithErrors = new Set();

  constructor(page: Page) {
    page.on("request", request => {
      request.continue();
      if (this.resourceType.includes(request.resourceType())) {
        this.pendingRequests.add(request);
        this.promisees.push(
          new Promise(resolve => {
            (request as unknown as ResolvedHolder).__resolver = resolve;
          })
        );
      }
    });

    page.on("requestfailed", request => {
      if (this.resourceType.includes(request.resourceType())) {
        this.pendingRequests.delete(request);
        this.finishedRequestsWithErrors.add(request);
        const holder = request as unknown as ResolvedHolder;
        if (holder.__resolver) {
          holder.__resolver();
          delete holder.__resolver;
        }
      }
    });

    page.on("requestfinished", request => {
      if (this.resourceType.includes(request.resourceType())) {
        this.pendingRequests.delete(request);
        this.finishedRequestsWithSuccess.add(request);
        const holder = request as unknown as ResolvedHolder;
        if (holder.__resolver) {
          holder.__resolver();
          delete holder.__resolver;
        }
      }
    });
  }

  async waitForAllRequests() {
    if (this.pendingRequestCount() === 0) {
      return;
    }
    await Promise.all(this.promisees);
  }

  pendingRequestCount() {
    return this.pendingRequests.size;
  }
}

exports = PuppeteerNetworkMonitor;
