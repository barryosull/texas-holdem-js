
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
    var $amount = $('#amount');
    if (action === 'bet') {
        if ($amount.attr('min') == 0) {
            $('#check').click();
        } else {
            $('#bet').click();
        }
    }
    if (action === 'raise') {
        let currentAmount = $amount.val();
        if (currentAmount) {
            $amount.val( currentAmount * 2 );
        } else {
            $amount.val( 40 );
        }

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
    }, 2000);

});




