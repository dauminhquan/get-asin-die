let express = require('express');
let router = express.Router();
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const axios = require('axios')
const excel = require('node-excel-export');
var Product = require('../model/products_out_of_stock')
var  RootUrl = require('../model/root_url')
const fs = require("fs");
const csv = require('fast-csv')
/* GET home page. */
router.get('/', function(req, res, next) {
    /*axios.get('https://www.amazon.com/s/gp/search?rh=n%3A1055398%2Cn%3A510240%2Cn%3A3737831%2Ck%3Aportable+garment+steamer%2Cp_n_availability%3A1248816011&keywords=portable+garment+steamer&page=8').then(data=>{
      return  res.send(data.data)
    }).catch(err => {
        console.log(err)
        return res.send(err.response.data)
        console.log('Bi chan')
    })*/
    return res.render('index');
});
router.post('/find-product',function(req,res,next) {
  let url = req.body.url;
  let key = req.body.key
    /*RootUrl.findOne({
        root_url: encodeURI(url)
    },function(err,data){
        if(err){
            console.log(err)
        }
        console.log(data)
        if(data == null)
        {
            let root_url = new RootUrl({
            root_url: url
            })
            root_url.save((error,doc) => {
                if(error)
                {
                    console.log('Url da ton tai')
                }
            })
        }
    })*/
    // console.log(encodeURI(url));
    getProducts(url,url,res.io,key)
    return res.json({
        'message' : "ok"
    })
})
router.get('/manage',function (req,res,next) {
    RootUrl.find({},function(err,docs){
        if(err)
        {
           return res.status(500).json({
                message: "error"
            })
        }
        let root_urls = []
        docs.forEach(doc => {
            root_urls.push(doc.root_url)

        })
        return res.render('manage',{
            root_urls: root_urls
        })
    })

})
router.post('/manage/upload-csv',function (req,res,next) {
    if (req.files) {
        let file = req.files.csvFile
        let fileName = new Date().getMilliseconds().toString()
        file.mv('./'+fileName,function(err){
            const stream = fs.createReadStream('./'+fileName)
            const streamCsv = csv({
                headers: true,
                delimiter:',',
                quote: '"'
            }).on('data',data => {
                Product.findOne({
                    asin: data.asin
                },(err,product) => {
                    if(err || product == null)
                    {
                        console.log(err)
                    }
                    else{
                        product.reject = true
                        product.save((error,document) => {
                            if(error)
                            {
                                console.log(error)
                            }
                        })
                    }
                })
            }).on('end',() => {
                fs.unlink('./'+fileName,function (err) {
                    if(err)
                    {
                        console.log(err)
                        return res.status(500).json(err)
                    }
                    let root_url = req.body.root_url
                    if(root_url!= undefined)
                    {
                        Product.find({},function(err,products){
                            if(err)
                            {
                                return res.status(500).json({
                                    message: "error"
                                })
                            }
                            let root_urls = []
                            let product_find = []
                            products.forEach(product => {
                                if(!root_urls.includes(product.root_url))
                                {
                                    root_urls.push(product.root_url)
                                }
                                if(product.root_url == root_url)
                                {
                                    product_find.push(product)
                                }

                            })
                            return res.render('manage_post',{
                                root_urls: root_urls,
                                product_find: product_find,
                                root_url: root_url
                            })
                        })
                    }
                    else{
                        return res.render('index',{
                            success: true
                        })
                    }
                })
            }).on('error',(err) => {
                return res.status(500).json(err)
            })
            stream.pipe(streamCsv)
        })
    }
    else{
        res.status(406).json({
            message: 'error'
        })
    }
})
router.get('/get-asin',function (req,res,next) {
    let root_url = req.query.root_url
    const styles = {
        headerDark: {
            fill: {
                fgColor: {
                    rgb: 'FF000000'
                }
            },
            font: {
                color: {
                    rgb: 'FFFFFFFF'
                },
                sz: 14,
                bold: true,
                underline: true
            }
        },
        cellPink: {
            fill: {
                fgColor: {
                    rgb: 'FFFFCCFF'
                }
            }
        },
        cellGreen: {
            fill: {
                fgColor: {
                    rgb: 'FF00FF00'
                }
            }
        }
    };
    const specification = {
        asin: {
            displayName: 'Asin', // <- Here you specify the column header
            headerStyle: styles.cellGreen, // <- Header style
            width: 120 // <- width in pixels
        },
        created_at: {
            displayName: 'Date time created', // <- Here you specify the column header
            headerStyle: styles.cellGreen, // <- Header style
            width: 120 // <- width in pixels
        },
        root_url: {
            displayName: 'Url find', // <- Here you specify the column header
            headerStyle: styles.cellGreen, // <- Header style
            width: 120 // <- width in pixels
        },
        url_found: {
            displayName: 'Url found', // <- Here you specify the column header
            headerStyle: styles.cellGreen, // <- Header style
            width: 120 // <- width in pixels
        },
        url_product: {
            displayName: 'Url Product', // <- Here you specify the column header
            headerStyle: styles.cellGreen, // <- Header style
            width: 120 // <- width in pixels
        }
    }

    Product.find({ root_url: root_url}, function (error, docs) {
        if(error)
        {
            return res.status(500).json(error)
        }
        console.log(docs.length)
        const report = excel.buildExport(
            [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
                {
                    name: 'ASIN', // <- Specify sheet name (optional)
                    // heading: heading, // <- Raw heading array (optional)
                    specification: specification, // <- Report specification
                    data: docs // <-- Report data
                }
            ]
        );
        let date = new Date()
        let currentTime = date.getFullYear()+'_'+(date.getMonth() + 1) + '_'+date.getDate()+'_'+date.getHours()+'_'+date.getMinutes()+
            '_'+date.getSeconds()
        res.attachment('report_'+currentTime+'.xlsx'); // This is sails.js specific (in general you need to set headers)
        return res.send(report);
        // return res.json(docs)
    });
})
/*router.get('/delete',function (req,res,next) {
    Product.remove({},function (err) {
        if(err)
        {
            console.log(err)
        }
        else{
            console.log('xóa xong product')
        }
    })
    RootUrl.remove({},function (err) {
        if(err)
        {
            console.log(err)
        }
        else{
            console.log('xóa xong url')
        }
    })
    return res.send('ok')
})*/
async function getProducts(url,root_url,socket,key)
{
    await axios.get(url,{
        headers:{
            Accept: 'text/html'
        }
    }).then( async response => {
        console.log(response.data)
        const { window } = new JSDOM(response.data);
        const $ = require('jquery')(window);
        let products = $('.s-result-item:contains(Currently unavailable)')
    // :contains(Currently unavailable)
        console.log(products.length)
        for(let i=0;i<products.length;i++)
        {
            let product = new Product({
                asin : $(products[i]).attr('data-asin'),
                root_url: root_url,
                url_found: url,
                url_product: $(products[i]).find('a:eq(0)').attr('href')
            })
            product.save(function(err){
                if(err)
                {
                    console.log('Loi luu san pham')
                }
            })
        }
        let nextLink = $('#pagnNextLink').attr('href')
        if(nextLink != undefined)
        {
                await timeout(5000)
                getUrl(nextLink,root_url,socket,key)
        }
        else{
            socket.emit(key,{
                message: 'done',
                root_url: url
            })
        }
    }).catch(err => {
        console.log(err)
        console.log('bị chặn')
    })
}
async function findProduct(url,socket,key){
    await getUrl(url,url,socket)

}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
module.exports = router;
