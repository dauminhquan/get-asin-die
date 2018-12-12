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
router.get('/',(req,res,next) => {
    res.render('index')
})

router.post('/put-asin',function (req,res,next) {
    let data = req.body.data
    if(data.length > 0)
    {
        for(let i = 0 ; i < data.length ; i++)
        {
            let product = new Product({
                asin : data[i].asin,
                url_found: data[i].url_found,
                url_product: data[i].url_product,
                keyword: data[i].keyword
            })
            product.save(function (err) {
                if(err)
                {
                    console.log('that bai')
                }
            })
        }
    }
    return res.json({
        status: 0
    })

})


router.get('/delete',function(req,res,next){
    Product.remove({},function(err){
        console.log(err)
    })
    res.send('ok')
})

router.post('/get-asin',function (req,res,next) {
    if(req.body.keyword == undefined)
    {
        return res.status(503).json({
            message: 'Khong co tu khoa'
        })
    }
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

    Product.find({keyword: req.body.keyword}, function (error, docs) {
        if(error)
        {
            return res.status(500).json(error)
        }
        if(docs.length == 0)
        {
            return res.status(503).json({
                message: 'Tu khoa khong ton tai'
            })
        }
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
        Product.remove({keyword: req.body.keyword},function (err) {
            if(err )
            {
                console.log(err)
            }
        })
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
    console.log('Dang tim sp')
    await axios.get(url).then( async response => {
        const { window } = new JSDOM(response.data);
        const $ = require('jquery')(window);
        let products = $('.s-result-item.celwidget:contains(Currently unavailable)')

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

                    console.log('Loi luu san pham - Trung Asin')
                }
            })
        }
        let nextLink = $('#pagnNextLink').attr('href')

        if(nextLink != undefined)
        {
            if(!nextLink.includes('amazon.com'))
            {
                nextLink = 'https://www.amazon.com'+nextLink
            }
            await timeout(5000)
            getProducts(nextLink,root_url,socket,key)
        }
        else{
            console.log('done')
            socket.emit(key,{
                message: 'done',
                root_url: url
            })
        }
    }).catch(err => {
        console.log('bị chặn')
        socket.emit(key,{
            message: 'done',
            root_url: url
        })
    })
}
async function findProduct(url,socket,key){
    await getUrl(url,url,socket)

}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
module.exports = router;
