const initApi = localSite => ({
  // IS_CLONE_MODE: () => true,
  // GET_DOCUMENT: () => localSite.getDocument(),
  OVERRIDE_DOCUMENT: newDocument => localSite.overrideDocument(newDocument)
  // GET_CODE: () => localSite.getCode(),
  // UPDATE_CODE: codeUpdates => localSite.updateCode(codeUpdates)
});

const handleRequest = handler => (payload, callback) => {
  return Promise.resolve(handler(payload))
    .then(result => callback(null, result))
    .catch(err => callback(err));
};

const socketHandler = localSite => socket => {
  const socketApi = initApi(localSite);
  Object.keys(socketApi).forEach(event => {
    socket.on(event, handleRequest(socketApi[event]));
  });
};

module.exports = socketHandler;
