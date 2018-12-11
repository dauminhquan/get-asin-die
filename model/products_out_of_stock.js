let mongoose = require('mongoose');

let Schema = new mongoose.Schema({
    asin: {
        type: String,
        unique: true,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    root_url: {
        type:String,
        required: true
    },
    url_found: {
        type: String,
        required: true
    },
    url_product: {
        type: String,
        required: true
    }
}, {collection: 'products_out_of_stock'});

let ProductsOutOfStock = module.exports = mongoose.model('ProductsOutOfStock', Schema);
