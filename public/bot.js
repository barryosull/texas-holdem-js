
function Bot()
{

}

Bot.prototype.chooseNextAction = function()
{
    var actionSeed  = Math.random();
    if (actionSeed < 0.6) {
        return 'bet';
    }
    if (actionSeed < 0.8) {
        return 'raise';
    }
    return 'fold';
};

function UiAdapter()
{

}

UiAdapter.prototype.isPlayersGo = function()
{
    return ($('.seat.turn.player').length === 1);
};

UiAdapter.prototype.performAction = function(action)
{
    if (action === 'bet') {
        $('#bet').click();
    }
    if (action === 'raise') {
        $('#amount').val( $('#amount').val() * 2 );
        $('#bet').click();
    }
    if (action === 'fold') {
        $('#fold').click();
    }
};


$(function(){

    var urlString = window.location.href;
    var url = new URL(urlString);
    var isBot = !!url.searchParams.get("isBot");

    if (!isBot) {
        return;
    }

    var bot = new Bot();
    var uiAdapter = new UiAdapter();

    setInterval(function(){
        if (uiAdapter.isPlayersGo()) {
            var action = bot.chooseNextAction();
            uiAdapter.performAction(action);
        }
    }, 1000);

});




