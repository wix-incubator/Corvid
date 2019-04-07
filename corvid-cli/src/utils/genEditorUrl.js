function genEditorUrl(useSsl, baseDomain, metasiteId, serverEditorPort) {
  const extraParams = process.env.QUERY ? `&${process.env.QUERY}` : "";
  return `${
    useSsl ? "https" : "http"
  }://${baseDomain}/editor/${metasiteId}?petri_ovr=specs.ExcludeSiteFromSsr=true&experiments=se_wixCodeLocalMode&corvidSessionId=${
    process.env.CORVID_SESSION_ID
  }&localServerPort=${serverEditorPort}${extraParams}`;
}

module.exports = genEditorUrl;
