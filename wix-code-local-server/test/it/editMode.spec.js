const loadEditor = require("@wix/fake-local-mode-editor");
const eventually = require("@wix/wix-eventually");
const localServer = require("../../src/server");
const {
  initLocalSite,
  readLocalSite,
  writeFile,
  deleteFile
} = require("../utils/localSiteDir");

describe("edit mode", () => {
  it("should not start the server in edit mode if the site directory is empty", async () => {
    const localSiteFiles = {};

    const localSitePath = await initLocalSite(localSiteFiles);

    const server = localServer.startInEditMode(localSitePath);

    await expect(server).rejects.toThrow("CAN_NOT_EDIT_EMPTY_SITE");
  });
  it("should send code files to the editor", async () => {
    const localSiteFiles = {
      public: {
        pages: {
          page1ID: ""
        },
        "public-file.json": "public code"
      },
      backend: {
        "sub-folder": {
          "backendFile.jsw": "backend code"
        }
      }
    };

    const localSitePath = await initLocalSite(localSiteFiles);
    const server = await localServer.startInEditMode(localSitePath);
    const editor = await loadEditor(server.port);

    const codeFiles = await editor.getCodeFiles();
    expect(codeFiles).toEqual({
      public: {
        "public-file.json": "public code"
      },
      backend: {
        "sub-folder": {
          "backendFile.jsw": "backend code"
        }
      }
    });

    await editor.close();
    await server.close();
  });

  it("should send site document to the editor", async () => {
    const localSiteFiles = {
      public: {
        pages: {
          "page1ID.json": ""
        }
      }
    };

    const localSitePath = await initLocalSite(localSiteFiles);
    const server = await localServer.startInEditMode(localSitePath);
    const editor = await loadEditor(server.port);

    const siteDocument = await editor.getSiteDocument();
    expect(siteDocument).toEqual(localSiteFiles);

    await editor.close();
    await server.close();
  });

  it("should update code files after editon changes on save", async () => {
    const localSiteFiles = {
      public: {
        pages: {
          "page1.json": "page code"
        },
        "public-file.json": "public code",
        "public-file1.json": "public code 1"
      },
      backend: {
        "sub-folder": {
          "backendFile.jsw": "backend code"
        }
      }
    };

    const localSitePath = await initLocalSite(localSiteFiles);
    const server = await localServer.startInEditMode(localSitePath);
    const editor = await loadEditor(server.port);
    editor.modifyCodeFile(
      "backend/authorization-config.json",
      'console.log("authorization-config")'
    );
    editor.deleteCodeFile("public/public-file1.json");
    editor.copyCodeFile(
      "public/public-file.json",
      "public/public-file-copied.json"
    );
    await editor.save();
    const codeFiles = await editor.getCodeFiles();
    const serverFiles = await readLocalSite(localSitePath);
    expect(serverFiles).toEqual({
      public: {
        pages: {
          "page1.json": "page code"
        },
        "public-file.json": "public code",
        "public-file-copied.json": "public code"
      },
      backend: {
        "sub-folder": {
          "backendFile.jsw": "backend code"
        },
        "authorization-config.json": 'console.log("authorization-config")'
      }
    });
    expect(codeFiles).toEqual({
      public: {
        "public-file.json": "public code",
        "public-file-copied.json": "public code"
      },
      backend: {
        "sub-folder": {
          "backendFile.jsw": "backend code"
        },
        "authorization-config.json": 'console.log("authorization-config")'
      }
    });
    await editor.close();
    await server.close();
  });

  it("should update the editor when a new code file is added locally", async () => {
    const localSiteFiles = {
      public: {
        pages: {
          "page1.json": "page code"
        },
        "public-file.json": "public code",
        "public-file1.json": "public code 1"
      },
      backend: {
        "sub-folder": {
          "backendFile.jsw": "backend code"
        }
      }
    };

    const localSitePath = await initLocalSite(localSiteFiles);
    const server = await localServer.startInEditMode(localSitePath);
    const editor = await loadEditor(server.port);
    const watcher = server.localSite.watcher;
    const mockFn = jest.fn();
    watcher.onAdd(mockFn);
    await writeFile(localSitePath, "public/test.js", "test");
    await eventually(async () => {
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith("public/test.js", "test");
    });

    await editor.close();
    await server.close();
  });

  it("should update the editor when a code file is modified locally", async () => {
    const localSiteFiles = {
      public: {
        pages: {
          "page1.json": "page code"
        },
        "public-file.json": "public code",
        "public-file1.json": "public code 1"
      },
      backend: {
        "sub-folder": {
          "backendFile.jsw": "backend code"
        }
      }
    };

    const localSitePath = await initLocalSite(localSiteFiles);
    const server = await localServer.startInEditMode(localSitePath);
    const editor = await loadEditor(server.port);
    const watcher = server.localSite.watcher;
    const mockFn = jest.fn();
    watcher.onChange(mockFn);
    await writeFile(localSitePath, "public/public-file.json", "test");
    await eventually(async () => {
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith("public/public-file.json", "test");
    });

    await editor.close();
    await server.close();
  });

  it("should update the editor when a page file is deleted locally", async () => {
    const localSiteFiles = {
      public: {
        pages: {
          "page1.json": "page code"
        },
        "public-file.json": "public code",
        "public-file1.json": "public code 1"
      },
      backend: {
        "sub-folder": {
          "backendFile.jsw": "backend code"
        }
      }
    };

    const localSitePath = await initLocalSite(localSiteFiles);
    const server = await localServer.startInEditMode(localSitePath);
    const editor = await loadEditor(server.port);
    const watcher = server.localSite.watcher;
    const mockFn = jest.fn();
    watcher.onDelete(mockFn);
    await deleteFile(localSitePath, "public/public-file.json");
    await eventually(async () => {
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith("public/public-file.json");
    });

    await editor.close();
    await server.close();
  });
});
