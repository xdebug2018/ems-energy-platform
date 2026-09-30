(function () {
  'use strict';

  const databaseName = 'ems-energy-platform-local';
  const databaseVersion = 2;
  const pageStore = 'page_content';
  const tenderStore = 'tender_records';

  function open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, databaseVersion);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(pageStore)) db.createObjectStore(pageStore, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(tenderStore)) db.createObjectStore(tenderStore, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function requestAsPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function collectOutline(root) {
    return [...root.querySelectorAll('h1,h2,h3,h4,p,li,small,b')]
      .map((node) => node.textContent.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 1000);
  }

  async function persistPage(options) {
    const root = document.querySelector(options.selector || 'main');
    if (!root || !window.indexedDB) return null;
    const record = {
      id: options.id || location.pathname.split('/').pop() || 'index.html',
      title: document.title,
      kind: options.kind || 'content',
      savedAt: new Date().toISOString(),
      outline: collectOutline(root),
      snapshot: root.innerHTML
    };
    try {
      const db = await open();
      const transaction = db.transaction(pageStore, 'readwrite');
      transaction.objectStore(pageStore).put(record);
      await new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
      db.close();
      document.documentElement.dataset.localData = 'saved';
      return record;
    } catch (error) {
      document.documentElement.dataset.localData = 'unavailable';
      console.warn('Local page database unavailable', error);
      return null;
    }
  }

  async function getPage(id) {
    const db = await open();
    const record = await requestAsPromise(db.transaction(pageStore, 'readonly').objectStore(pageStore).get(id));
    db.close();
    return record || null;
  }

  window.EMSLocalData = { open, getPage, persistPage, databaseName, databaseVersion, pageStore, tenderStore };
}());
