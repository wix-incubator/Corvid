const fetchMock = require("fetch-mock");
const { localSiteBuilder } = require("corvid-local-site/testkit");
const { initTempDir } = require("corvid-local-test-utils");
const {
  server: localFakeEditorServer
} = require("corvid-fake-local-mode-editor");
const sessionData = require("../../src/utils/sessionData");
const { killAllChildProcesses } = require("../../src/utils/electron");

jest.mock("../../src/commands/login");
const { pull } = require("./cliDriver");
const base64 = require("../utils/base64");
const metaSiteSearchEndpoint =
  "https://www.wix.com/meta-site-search-web/v2/search";

describe("pull", () => {
  process.env.CORVID_SESSION_ID = "testCorvidId";
  let editorServer;
  beforeEach(async () => {
    editorServer = await localFakeEditorServer.start();
    process.env.CORVID_CLI_WIX_DOMAIN = `localhost:${editorServer.port}`;
    process.env.DISABLE_SSL = true;
  });

  afterEach(async () => {
    sessionData.reset();
    fetchMock.restore();
    await localFakeEditorServer.killAllRunningServers();
    await killAllChildProcesses();
  });

  const setupSuccessfullPull = async () => {
    const tempDir = await initTempDir({
      ".corvid": { "corvidrc.json": '{ "metasiteId": "12345678" }' }
    });

    fetchMock
      .mock(
        metaSiteSearchEndpoint,
        JSON.stringify(
          {
            entries: [
              {
                metaSiteId: "12345678",
                viewerUrl: "http://a-site.com",
                name: "aSite"
              }
            ]
          },
          null,
          2
        )
      )
      .mock(
        `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
          process.env.CORVID_SESSION_ID
        }&status=start&type=regular`,
        JSON.stringify({})
      )
      .mock(
        `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
          process.env.CORVID_SESSION_ID
        }&status=success&type=regular`,
        JSON.stringify({})
      );

    return tempDir;
  };

  describe("when run in a directory with a config file and no site files", () => {
    test("should report to stdout when the process is complete", async () => {
      expect.assertions(1);
      const tempDir = await initTempDir({
        ".corvid": { "corvidrc.json": '{ "metasiteId": "12345678" }' }
      });

      fetchMock
        .mock(
          metaSiteSearchEndpoint,
          JSON.stringify(
            {
              entries: [
                {
                  metaSiteId: "12345678",
                  viewerUrl: "http://a-site.com",
                  name: "aSite"
                }
              ]
            },
            null,
            2
          )
        )
        .mock(
          `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
            process.env.CORVID_SESSION_ID
          }&status=start&type=regular`,
          JSON.stringify({})
        )
        .mock(
          `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
            process.env.CORVID_SESSION_ID
          }&status=success&type=regular`,
          JSON.stringify({})
        );

      return expect(pull(tempDir)).resolves.toMatch(/Pull complete/);
    });

    test("should report to BI a pull start event", async () => {
      expect.assertions(1);
      const tempDir = await initTempDir({
        ".corvid": { "corvidrc.json": '{ "metasiteId": "12345678" }' }
      });

      fetchMock
        .mock(
          metaSiteSearchEndpoint,
          JSON.stringify(
            {
              entries: [
                {
                  metaSiteId: "12345678",
                  viewerUrl: "http://a-site.com",
                  name: "aSite"
                }
              ]
            },
            null,
            2
          )
        )
        .mock(
          `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
            process.env.CORVID_SESSION_ID
          }&status=start&type=regular`,
          JSON.stringify({})
        )
        .mock(
          `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
            process.env.CORVID_SESSION_ID
          }&status=success&type=regular`,
          JSON.stringify({})
        );

      await pull(tempDir);

      expect(
        fetchMock.called(
          `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
            process.env.CORVID_SESSION_ID
          }&status=start&type=regular`
        )
      ).toBe(true);
    });

    test("should report to BI a pull success event", async () => {
      expect.assertions(1);
      const tempDir = await initTempDir({
        ".corvid": { "corvidrc.json": '{ "metasiteId": "12345678" }' }
      });

      fetchMock
        .mock(
          metaSiteSearchEndpoint,
          JSON.stringify(
            {
              entries: [
                {
                  metaSiteId: "12345678",
                  viewerUrl: "http://a-site.com",
                  name: "aSite"
                }
              ]
            },
            null,
            2
          )
        )
        .mock(
          `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
            process.env.CORVID_SESSION_ID
          }&status=start&type=regular`,
          JSON.stringify({})
        )
        .mock(
          `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
            process.env.CORVID_SESSION_ID
          }&status=success&type=regular`,
          JSON.stringify({})
        );

      await pull(tempDir);

      expect(
        fetchMock.called(
          `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
            process.env.CORVID_SESSION_ID
          }&status=success&type=regular`
        )
      ).toBe(true);
    });
  });

  describe("when run in a directory with a config file and site files", () => {
    test("should report to BI a pull start event", async () => {
      expect.assertions(1);
      const localSiteFiles = localSiteBuilder.buildFull();
      const tempDir = await initTempDir(
        Object.assign(
          {
            ".corvid": { "corvidrc.json": '{ "metasiteId": "12345678" }' }
          },
          { src: localSiteFiles }
        )
      );

      fetchMock
        .mock(
          metaSiteSearchEndpoint,
          JSON.stringify(
            {
              entries: [
                {
                  metaSiteId: "12345678",
                  viewerUrl: "http://a-site.com",
                  name: "aSite"
                }
              ]
            },
            null,
            2
          )
        )
        .mock(
          `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
            process.env.CORVID_SESSION_ID
          }&status=start&type=regular`,
          JSON.stringify({})
        )
        .mock(
          `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
            process.env.CORVID_SESSION_ID
          }&status=fail&type=regular`,
          JSON.stringify({})
        );

      await pull(tempDir).catch(() => {});

      expect(
        fetchMock.called(
          `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
            process.env.CORVID_SESSION_ID
          }&status=start&type=regular`
        )
      ).toBe(true);
    });

    test("should report to BI a pull fail event", async () => {
      expect.assertions(1);
      const localSiteFiles = localSiteBuilder.buildFull();
      const tempDir = await initTempDir(
        Object.assign(
          {
            ".corvid": { "corvidrc.json": '{ "metasiteId": "12345678" }' }
          },
          { src: localSiteFiles }
        )
      );

      fetchMock
        .mock(
          metaSiteSearchEndpoint,
          JSON.stringify(
            {
              entries: [
                {
                  metaSiteId: "12345678",
                  viewerUrl: "http://a-site.com",
                  name: "aSite"
                }
              ]
            },
            null,
            2
          )
        )
        .mock(
          `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
            process.env.CORVID_SESSION_ID
          }&status=start&type=regular`,
          JSON.stringify({})
        )
        .mock(
          `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
            process.env.CORVID_SESSION_ID
          }&status=fail&type=regular`,
          JSON.stringify({})
        );

      await pull(tempDir).catch(() => {});

      expect(
        fetchMock.called(
          `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
            process.env.CORVID_SESSION_ID
          }&status=fail&type=regular`
        )
      ).toBe(true);
    });

    describe("and given the --override flag", () => {
      test("should report to BI a pull start event", async () => {
        expect.assertions(1);
        const localSiteFiles = localSiteBuilder.buildFull();
        const tempDir = await initTempDir(
          Object.assign(
            {
              ".corvid": { "corvidrc.json": '{ "metasiteId": "12345678" }' }
            },
            { src: localSiteFiles }
          )
        );

        fetchMock
          .mock(
            metaSiteSearchEndpoint,
            JSON.stringify(
              {
                entries: [
                  {
                    metaSiteId: "12345678",
                    viewerUrl: "http://a-site.com",
                    name: "aSite"
                  }
                ]
              },
              null,
              2
            )
          )
          .mock(
            `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
              process.env.CORVID_SESSION_ID
            }&status=start&type=override`,
            JSON.stringify({})
          )
          .mock(
            `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
              process.env.CORVID_SESSION_ID
            }&status=success&type=override`,
            JSON.stringify({})
          );

        await pull(tempDir, "--override").catch(() => {});

        expect(
          fetchMock.called(
            `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
              process.env.CORVID_SESSION_ID
            }&status=start&type=override`
          )
        ).toBe(true);
      });

      test("should report to BI a pull success event", async () => {
        expect.assertions(1);
        const localSiteFiles = localSiteBuilder.buildFull();
        const tempDir = await initTempDir(
          Object.assign(
            {
              ".corvid": { "corvidrc.json": '{ "metasiteId": "12345678" }' }
            },
            { src: localSiteFiles }
          )
        );

        fetchMock
          .mock(
            metaSiteSearchEndpoint,
            JSON.stringify(
              {
                entries: [
                  {
                    metaSiteId: "12345678",
                    viewerUrl: "http://a-site.com",
                    name: "aSite"
                  }
                ]
              },
              null,
              2
            )
          )
          .mock(
            `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
              process.env.CORVID_SESSION_ID
            }&status=start&type=override`,
            JSON.stringify({})
          )
          .mock(
            `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
              process.env.CORVID_SESSION_ID
            }&status=success&type=override`,
            JSON.stringify({})
          );

        await pull(tempDir, "--override").catch(() => {});

        expect(
          fetchMock.called(
            `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
              process.env.CORVID_SESSION_ID
            }&status=success&type=override`
          )
        ).toBe(true);
      });
    });

    describe("and given the --move flag", () => {
      test("should report to BI a pull start event", async () => {
        expect.assertions(1);
        const localSiteFiles = localSiteBuilder.buildFull();
        const tempDir = await initTempDir(
          Object.assign(
            {
              ".corvid": { "corvidrc.json": '{ "metasiteId": "12345678" }' }
            },
            { src: localSiteFiles }
          )
        );

        fetchMock
          .mock(
            metaSiteSearchEndpoint,
            JSON.stringify(
              {
                entries: [
                  {
                    metaSiteId: "12345678",
                    viewerUrl: "http://a-site.com",
                    name: "aSite"
                  }
                ]
              },
              null,
              2
            )
          )
          .mock(
            `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
              process.env.CORVID_SESSION_ID
            }&status=start&type=move`,
            JSON.stringify({})
          )
          .mock(
            `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
              process.env.CORVID_SESSION_ID
            }&status=success&type=move`,
            JSON.stringify({})
          );

        await pull(tempDir, "--move").catch(() => {});

        expect(
          fetchMock.called(
            `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
              process.env.CORVID_SESSION_ID
            }&status=start&type=move`
          )
        ).toBe(true);
      });

      test("should report to BI a pull success event", async () => {
        expect.assertions(1);
        const localSiteFiles = localSiteBuilder.buildFull();
        const tempDir = await initTempDir(
          Object.assign(
            {
              ".corvid": { "corvidrc.json": '{ "metasiteId": "12345678" }' }
            },
            { src: localSiteFiles }
          )
        );

        fetchMock
          .mock(
            metaSiteSearchEndpoint,
            JSON.stringify(
              {
                entries: [
                  {
                    metaSiteId: "12345678",
                    viewerUrl: "http://a-site.com",
                    name: "aSite"
                  }
                ]
              },
              null,
              2
            )
          )
          .mock(
            `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
              process.env.CORVID_SESSION_ID
            }&status=start&type=move`,
            JSON.stringify({})
          )
          .mock(
            `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
              process.env.CORVID_SESSION_ID
            }&status=success&type=move`,
            JSON.stringify({})
          );

        await pull(tempDir, "--move").catch(() => {});

        expect(
          fetchMock.called(
            `http://frog.wix.com/code?src=39&evid=202&msid=12345678&uuid=testGuid&csi=${
              process.env.CORVID_SESSION_ID
            }&status=success&type=move`
          )
        ).toBe(true);
      });
    });
  });

  describe("when run in a directory without a config file", () => {
    test("should print to stderr a message explaining the error", async () => {
      expect.assertions(1);
      const tempDir = await initTempDir({});

      return expect(pull(tempDir)).rejects.toThrow(/Project not found in/);
    });
  });

  describe("bi context", () => {
    const expectedPullBiContext = JSON.stringify({
      builderEnv: "local",
      isHeadless: true
    });

    test("should open the editor with the correct bi context query parameter", async () => {
      const tempDir = await setupSuccessfullPull();

      const biContextQueryPromise = new Promise(resolve => {
        editorServer.onEditorRequest(req => {
          resolve(req.query["x-wix-bi-context"]);
        });
      });

      await pull(tempDir);

      const biContextQueryValue = await biContextQueryPromise;

      expect(base64.decode(biContextQueryValue)).toEqual(expectedPullBiContext);
    });

    test("should open the editor with the correct bi context header ", async () => {
      const tempDir = await setupSuccessfullPull();

      const biContextHeaderPromise = new Promise(resolve => {
        editorServer.onEditorRequest(req => {
          resolve(req.get("x-wix-bi-context"));
        });
      });

      await pull(tempDir);

      const biContextHeaderValue = await biContextHeaderPromise;

      expect(base64.decode(biContextHeaderValue)).toEqual(
        expectedPullBiContext
      );
    });
  });
});
