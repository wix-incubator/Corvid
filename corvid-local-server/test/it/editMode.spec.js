const eventually = require("wix-eventually");
const { editorSiteBuilder } = require("fake-local-mode-editor");
const { localSiteBuilder } = require("corvid-local-site/testkit");
const { siteCreators: sc } = require("corvid-local-test-utils");
const merge_ = require("lodash/merge");
const {
  editor: loadEditor,
  localServer,
  closeAll
} = require("../utils/autoClosing");
const localSiteDir = require("../utils/localSiteDir");

afterEach(closeAll);

describe("edit mode", () => {
  it("should not start the server in edit mode if the site directory is empty", async () => {
    const localSiteFiles = {};

    const localSitePath = await localSiteDir.initLocalSite(localSiteFiles);

    const server = localServer.startInEditMode(localSitePath);

    await expect(server).rejects.toThrow("CAN_NOT_EDIT_EMPTY_SITE");
  });

  it("should send code files to the editor on load", async () => {
    const siteItems = [
      sc.publicCode(),
      sc.backendCode(),
      sc.collectionSchema()
    ];

    const localSiteFiles = localSiteBuilder.buildFull(...siteItems);

    const localSitePath = await localSiteDir.initLocalSite(localSiteFiles);
    const server = await localServer.startInEditMode(localSitePath);
    const editor = await loadEditor(server.port);

    const editorSite = await editor.getSite();
    expect(editorSite).toMatchObject(
      editorSiteBuilder.buildPartial(...siteItems)
    );
  });

  it("should send page code files to the editor on load", async () => {
    const pageWithCode = sc.pageWithCode();

    const localSiteFiles = localSiteBuilder.buildFull(pageWithCode);

    const localSitePath = await localSiteDir.initLocalSite(localSiteFiles);
    const server = await localServer.startInEditMode(localSitePath);

    const editor = await loadEditor(server.port);
    const editorSite = await editor.getSite();
    const expectedEditorSite = editorSiteBuilder.buildPartial(pageWithCode);
    expect(editorSite).toMatchObject(expectedEditorSite);
  });

  it("should send lightbox code files to the editor on load", async () => {
    const lightBoxWithCode = sc.lightboxWithCode();

    const localSiteFiles = localSiteBuilder.buildFull(lightBoxWithCode);
    const localSitePath = await localSiteDir.initLocalSite(localSiteFiles);
    const server = await localServer.startInEditMode(localSitePath);

    const editor = await loadEditor(server.port);
    const editorSite = await editor.getSite();
    const expectedEditorSite = editorSiteBuilder.buildPartial(lightBoxWithCode);

    expect(editorSite).toMatchObject(expectedEditorSite);
  });

  it("should send master page code to the editor on load", async () => {
    const masterPageCode = sc.masterPageCode();

    const localSiteFiles = localSiteBuilder.buildFull(masterPageCode);
    const localSitePath = await localSiteDir.initLocalSite(localSiteFiles);
    const server = await localServer.startInEditMode(localSitePath);

    const editor = await loadEditor(server.port);
    const editorSite = await editor.getSite();
    const expectedEditorSite = editorSiteBuilder.buildPartial(masterPageCode);

    expect(editorSite).toMatchObject(expectedEditorSite);
  });

  it("should send site document to the editor on load", async () => {
    const siteItems = sc.fullSiteItems();

    const localSiteFiles = localSiteBuilder.buildPartial(...siteItems);

    const localSitePath = await localSiteDir.initLocalSite(localSiteFiles);
    const server = await localServer.startInEditMode(localSitePath);
    const editor = await loadEditor(server.port);

    const editorSite = await editor.getSite();

    const expectedSite = editorSiteBuilder.buildPartial(...siteItems);

    expect(editorSite).toMatchObject(expectedSite);
  });

  it("should send updated site document when user changes page content from the editor and clicks save", async () => {
    const existingSiteItems = [
      sc.page({ pageId: "page1", content: "existing content" }),
      sc.lightbox({
        pageId: "lightbox1",
        content: "existing content"
      })
    ];

    const localSiteFiles = localSiteBuilder.buildFull(...existingSiteItems);

    const localSitePath = await localSiteDir.initLocalSite(localSiteFiles);
    const server = await localServer.startInEditMode(localSitePath);
    const editor = await loadEditor(server.port);

    const editorSite = editor.getSite();

    const updatedSiteItems = [
      sc.page({ pageId: "page1", content: "modified content" }),
      sc.lightbox({
        pageId: "lightbox1",
        content: "modified content"
      }),
      sc.page({ pageId: "page2" }) //  new page
    ];

    const siteUpdates = editorSiteBuilder.buildPartial(...updatedSiteItems);
    editor.modifyDocument(merge_({}, editorSite, siteUpdates).siteDocument);

    await editor.save();

    const localSite = await localSiteDir.readLocalSite(localSitePath);

    const expectedLocalSite = localSiteBuilder.buildPartial(
      ...updatedSiteItems
    );

    expect(localSite).toMatchObject(expectedLocalSite);
  });

  // todo:: split this test to 6 test, (modify pageCode & regular code), (delete pageCode & regular code), (copy pageCode & regular code)
  it("should update code files after editor changes and clicks save", async () => {
    const siteItems = [
      sc.pageWithCode({ pageId: "page-1" }, "page code"),
      sc.pageWithCode({ pageId: "page-2" }, "page-2 code file options"),
      sc.publicCode("public-file.json", "public code"),
      sc.publicCode("public-file1.json", "public code 1"),
      sc.backendCode("sub-folder/backendFile.jsw", "backend code"),
      sc.collectionSchema("collection", "old schema contents")
    ];

    const localSiteFiles = localSiteBuilder.buildFull(...siteItems);

    const localSitePath = await localSiteDir.initLocalSite(localSiteFiles);
    const server = await localServer.startInEditMode(localSitePath);
    const editor = await loadEditor(server.port);
    editor.modifyCodeFile(
      "backend/authorization-config.json",
      "console.log('authorization-config')"
    );

    editor.modifyPageCodeFile("page-1", "code file options8888");
    editor.deletePageCodeFile("page-2");
    editor.deleteCodeFile("public/public-file1.json");
    editor.copyCodeFile(
      "public/public-file.json",
      "public/public-file-copied.json"
    );
    editor.modifyCollectionSchema("collection", "new schema contents");

    await editor.save();

    const expected = localSiteBuilder.buildPartial(
      sc.pageWithCode({ pageId: "page-1" }, "code file options8888"),
      sc.publicCode("public-file.json", "public code"),
      sc.backendCode("sub-folder/backendFile.jsw", "backend code"),
      sc.backendCode(
        "authorization-config.json",
        "console.log('authorization-config')"
      ),
      sc.collectionSchema("collection", "new schema contents")
    );

    const serverFiles = await localSiteDir.readLocalSite(localSitePath);

    expect(serverFiles).toMatchObject(expected);
    expect(serverFiles).not.toMatchObject(
      sc.publicCode("public/public-file1.json", "public code 1")
    );
    //todo:: check test
    expect(serverFiles).not.toMatchObject(
      sc.pageWithCode({ pageId: "page-2" }, "page-2 code file options")
    );
  });

  it("should update the editor when a new code file is added locally", async () => {
    // TODO: add schema files when refactoring this test
    const localSitePath = await localSiteDir.initLocalSite(
      localSiteBuilder.buildFull()
    );
    const server = await localServer.startInEditMode(localSitePath);
    const editor = await loadEditor(server.port);

    await localSiteDir.writeFile(
      localSitePath,
      localSiteBuilder.getLocalFilePath(sc.publicCode("newFile.js")),
      "test content"
    );

    await eventually(
      async () => {
        const editorSite = await editor.getSite();
        const expectedEditorSite = editorSiteBuilder.buildPartial(
          sc.publicCode("newFile.js", "test content")
        );
        expect(editorSite).toMatchObject(expectedEditorSite);
      },
      { timeout: 3000 }
    );
  });

  it("should update the editor when a code file is modified locally", async () => {
    // TODO: add schema files when refactoring this test
    const publicCode = sc.publicCode();
    const pageWithCode = sc.pageWithCode(
      { pageId: "page-1" },
      "code file options8888"
    );
    const newContent = "updated code file";

    const localSiteFiles = localSiteBuilder.buildFull(publicCode, pageWithCode);
    const localSitePath = await localSiteDir.initLocalSite(localSiteFiles);

    const server = await localServer.startInEditMode(localSitePath);
    const editor = await loadEditor(server.port);

    await localSiteDir.writeFile(
      localSitePath,
      localSiteBuilder.getLocalFilePath(publicCode),
      newContent
    );
    await localSiteDir.writeFile(
      localSitePath,
      localSiteBuilder.getLocalFilePath(pageWithCode).code,
      newContent
    );

    const expectedEditorSite = editorSiteBuilder.buildPartial(
      Object.assign(publicCode, { content: newContent }),
      Object.assign(pageWithCode, { code: newContent })
    );

    await eventually(
      async () => {
        const editorSite = await editor.getSite();
        expect(editorSite.siteCode).toMatchObject(expectedEditorSite.siteCode);
      },
      { timeout: 3000 }
    );
  });

  it("should update the editor when a code file is deleted locally", async () => {
    // TODO: add schema files when refactoring this test
    const file1 = sc.publicCode("public-file.json", "public code");
    const file2 = sc.publicCode("public-file1.json", "public code 1");
    const pageWithCode = sc.pageWithCode(
      { pageId: "page-1" },
      "code file options8888"
    );

    const localSiteFiles = localSiteBuilder.buildFull(
      file1,
      file2,
      pageWithCode
    );
    const localSitePath = await localSiteDir.initLocalSite(localSiteFiles);
    const server = await localServer.startInEditMode(localSitePath);
    const editor = await loadEditor(server.port);

    await localSiteDir.deleteFile(
      localSitePath,
      localSiteBuilder.getLocalFilePath(file1)
    );
    await localSiteDir.deleteFile(
      localSitePath,
      localSiteBuilder.getLocalFilePath(pageWithCode).code
    );

    await eventually(
      async () => {
        const editorSite = await editor.getSite();
        expect(editorSite).not.toMatchObject(
          editorSiteBuilder.buildPartial(file1, pageWithCode)
        );
      },
      { timeout: 3000 }
    );
  });

  it("should notify the editor when local document has changed locally", async () => {
    const page = sc.page({ pageId: "page1", content: "existing content" });
    const onDocumentChange = jest.fn();

    const localSitePath = await localSiteDir.initLocalSite(page);
    const server = await localServer.startInEditMode(localSitePath);
    const editor = await loadEditor(server.port);

    const unsubscribeFromDocumentChange = editor.registerDocumentChange(
      onDocumentChange
    );
    const localFilePath = localSiteBuilder.getLocalFilePath(page);

    await localSiteDir.writeFile(localSitePath, localFilePath, "new content");

    await eventually(
      async () => {
        expect(onDocumentChange).toHaveBeenCalledTimes(1);
      },
      { timeout: 3000 }
    );

    unsubscribeFromDocumentChange();
  });

  it("should NOT notify document change to the editor when local public code has changed locally", async () => {
    const code = sc.publicCode("page1.js", "existing content");
    const onDocumentChange = jest.fn();
    const onCodeChange = jest.fn();

    const localSitePath = await localSiteDir.initLocalSite(code);
    const server = await localServer.startInEditMode(localSitePath);
    const editor = await loadEditor(server.port);

    const unsubscribeFromDocumentChange = editor.registerDocumentChange(
      onDocumentChange
    );
    const unsubscribeFromCodeChange = editor.registerCodeChange(onCodeChange);
    const localFilePath = localSiteBuilder.getLocalFilePath(code);

    await localSiteDir.writeFile(localSitePath, localFilePath, "new content");

    await eventually(
      async () => {
        expect(onDocumentChange).not.toHaveBeenCalled();
        // todo:: change to  => expect(onCodeChange).toHaveBeenCalledTimes(1);
        expect(onCodeChange).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    unsubscribeFromDocumentChange();
    unsubscribeFromCodeChange();
  });
});