const fs = require('fs');
const _ = require('lodash');
const cheerio = require('cheerio');
const sanitizeHtml = require('sanitize-html');
const stream = require('stream');

const RECIPE_PAGES_NUM = 918;

function clean(str){
    str = str.replace("\s", "").replace("\r", "");
    str = sanitizeHtml(str, {
        allowedTags: [ 'br', 'b', 'i', 'em', 'strong', 'li' ],
    });
    
    return str;
}

async function parseRecipePage(recipePageURL) {
    const response = await fetch(recipePageURL);
    const html = await response.text()

    if(html.includes('/img/front/estamos-trabajando.2.jpg')){
        process.stderr.write(`x ${recipePageURL}\n`);
        return
    }else{
        process.stderr.write(`r ${recipePageURL}\n`);
    }

    const $ = cheerio.load(html);

    const videoEmbedURL = $('#tutorial .embed-responsive-item').attr('src');
    const imagePath = $('.slider-for img').attr('src');
    const imageURL = imagePath ? `https://cocinerosargentinos.com${imagePath.replace('500x500', 'original')}` : null;

    const recipe = {
        sourceURL: recipePageURL,
        imageURL: imageURL ? imageURL : null, 
        imageFile: imageURL ? imageURL.split('/').pop() : null, 
        videoURL: videoEmbedURL ? videoEmbedURL.replace(/\?.*/, '').replace('embed/', 'watch?v=') : null,
        category: $('.brand').text().trim(),
        title: $('.product-name').text().trim(),
        ingredients: clean($('.short-description').html()).trim(),
        description: clean($('#product_tabs_description').html()).trim(),
        tags: $('.product-shop > a').map(function (i, el){
            return $(this).text()
        }).toArray(),
    };

    return recipe;
}

async function parseRecipeListPage(recipeListPageURL){
    const response = await fetch(recipeListPageURL);
    const html = await response.text()
    process.stderr.write(`p ${recipeListPageURL}\n`);
    const $ = cheerio.load(html);

    return $('.products-grid .item-title > a').map(function (i, el){
        return `https://cocinerosargentinos.com${$(this).attr('href')}`;
    }).toArray()
}

async function downloadImageTo(imageURL, downloadDir){
    const fileName = `${downloadDir}/${imageURL.split("/").pop()}`;
    const response = await fetch(imageURL);
    process.stderr.write(`i ${imageURL}\n`);
    if (response.ok && response.body) {
        let writer = fs.createWriteStream(fileName);
        stream.Readable.fromWeb(response.body).pipe(writer);
    }
}

(async () => {
    let ts = Date.now();
    let exportDir = `exports/${ts}`;
    let exportImagesDir = `exports/${ts}/images`;

    let recipeListPages = [];
    let recipePages = [];
    let recipes = [];

    for(let i = 1; i <= RECIPE_PAGES_NUM; i++){
        recipeListPages.push(`https://cocinerosargentinos.com/recetas?page=${i}`)
    }

    for(let chunk of _.chunk(recipeListPages, 100)){
        recipePages.push(await Promise.all(chunk.map(u => parseRecipeListPage(u) )))
    }

    recipePages = _.flattenDeep(recipePages)

    for(let chunk of _.chunk(recipePages, 100)){
        recipes.push((await Promise.all(chunk.map(u => parseRecipePage(u)).filter(e => e))))
    }
    
    recipes = _.flatten(recipes)

    fs.mkdirSync(exportDir)
    fs.writeFileSync(`${exportDir}/recipes.json`, JSON.stringify(recipes))
    
    fs.mkdirSync(exportImagesDir)
    for(let chunk of _(recipes).map('imageURL').compact().chunk(20).value()){
        await Promise.all(chunk.map(u => downloadImageTo(u, exportImagesDir)))
    }

})()