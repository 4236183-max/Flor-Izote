exports.admin = (req, event, data) => req.app.get('io')?.to('admin').emit(event, data);
exports.all = (req, event, data) => req.app.get('io')?.emit(event, data);
