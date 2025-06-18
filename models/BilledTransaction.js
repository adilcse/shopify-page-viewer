const mongoose = require('mongoose');

const BilledTransactionSchema = new mongoose.Schema({
    shop: String,
    status: String
});

// This pattern prevents Mongoose from recompiling the model, avoiding OverwriteModelError
module.exports = mongoose.models.billedtransactions || mongoose.model('billedtransactions', BilledTransactionSchema); 