const _ = require('lodash');
const cheerio = require('cheerio');
const sanitizeHtml = require('sanitize-html');

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

    const imagePath = $('.slider-for img').attr('src');
    const videoEmbedURL = $('#tutorial .embed-responsive-item').attr('src');

    const recipe = {
        imageURL: imagePath ? `https://cocinerosargentinos.com${imagePath.replace('500x500', 'original')}` : null, 
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

(async () => {
    let recipeListPages = [];
    let recipePages = [];
    let recipes = [];

    for(let i = 1; i <= RECIPE_PAGES_NUM; i++){
        recipeListPages.push(`https://cocinerosargentinos.com/recetas?page=${i}`)
    }

    for(let chunk of _.chunk(recipeListPages, 100)){
        recipePages.push(await Promise.all(chunk.map(u => parseRecipeListPage(u) )))
    }

    for(let chunk of _.chunk(_.flattenDeep(recipePages), 100)){
        recipes.push((await Promise.all(chunk.map(u => parseRecipePage(u)).filter(e => e))))
    }

    process.stdout.write(JSON.stringify(_.flatten(recipes)));
})()

