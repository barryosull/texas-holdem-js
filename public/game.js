
/************************************
 * Game interface, calls the HTTP API
 ************************************/
var Game = {
    gameId: null,
    socketId: null
};

Game.bootClient = function(gameId, socketId)
{
    Game.gameId = gameId;
    Game.socketId = socketId;

    $.ajaxSetup({
        beforeSend: function(xhr)
        {
            xhr.setRequestHeader("Authorization", "Bearer " + socketId);
        }
    });
};

Game.join = function(playerId, playerName)
{
    return $.post(
        "api/game/" + Game.gameId + "/join",
        {
            playerId: playerId,
            playerName: playerName
        },
        d => {},
        "json"
    );
};

Game.dealHands = function()
{
    $.post("api/game/" + Game.gameId + "/deal");
};

Game.dealFlop = function()
{
    $.post("api/game/" + Game.gameId + "/flop");
};

Game.dealTurn = function()
{
    $.post("api/game/" + Game.gameId + "/turn");
};

Game.dealRiver = function()
{
    $.post("api/game/" + Game.gameId + "/river");
};

Game.finishRound = function()
{
    $.post("api/game/" + Game.gameId + "/finish/");
};

Game.giveChipsToPlayer = function(playerId, amount)
{
    return $.post(
        "api/game/" + Game.gameId + "/give-chips-to-player",
        {
            playerId: playerId,
            amount: amount
        },
        d => {},
        "json"
    );
};

Game.foldHand = function(playerId)
{
    $.post("api/game/" + Game.gameId + "/fold/" + playerId);
};

Game.makeBet = function(playerId, amount)
{
    $.post(
        "/api/game/" + Game.gameId + "/bet/" + playerId,
        {
            amount: amount
        },
        d => {},
        "json"
    );
};

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

var Controller = {
    playerId: null,
    eventHandlers: {}
};

Controller.startGame = function()
{
    Game.dealHands();
    View.showFlopButton();
};

Controller.dealFlop = function()
{
    Game.dealFlop();
    View.showTurnButton();
};

Controller.dealTurn = function()
{
    Game.dealTurn();
    View.showRiverButton();
};

Controller.dealRiver = function()
{
    Game.dealRiver();
    View.showFinishButton();
};

Controller.finishRound = function()
{
    Game.finishRound();
};

Controller.foldHand = function()
{
    Game.foldHand(Controller.playerId);
    View.disableFoldButton();
};

Controller.placeBet = function()
{
    var $amount = $('#amount');
    var amount = $amount.val() === "" ? 0 : parseInt($amount.val());
    var minAmount = parseInt($amount.attr('min'));
    if (amount < minAmount) {
        alert("Bet too low to play. Minimum bet is "+ minAmount + ".");
        return;
    }
    Game.makeBet(Controller.playerId, amount);
    $amount.val('');
};

Controller.joinGame = function()
{
    var isValidName = false;
    var wantsToChangeName = Controller.wantsToChangeName();
    var playerName = Cookies.get('playerName');

    while ((!playerName || wantsToChangeName) && !isValidName) {
        playerName = prompt("What is your screen name?");

        if (playerName.length !== 0) {
            Cookies.set('playerName', playerName);
            break;
        }
        alert("Name cannot be empty.")
    }

    Controller.playerId = Controller.getPlayerId() || Controller.createPlayerId();

    Game.join(Controller.playerId, playerName).done(Controller.replayNotifications);

    View.hideCommunityCardsButtons();
    View.disableBetting();
    View.emptyPot();
    View.showDealButton();
};

Controller.replayNotifications = function(notificationList)
{
    for (var i in notificationList) {
        let type = notificationList[i].type;
        let notification = notificationList[i].notification;
        Controller.eventHandlers[type](notification);
    }
};

Controller.getPlayerId = function()
{
    return Cookies.get('playerId');
};

Controller.createPlayerId = function()
{
    var playerId = uuidv4();
    Cookies.set('playerId', playerId);
    return playerId;
};

Controller.isFirstPlayer = function(seats)
{
    for (var index in seats) {
        var seat = seats[index];
        if (seat.playerId) {
            return seat.playerId === Controller.playerId;
        }
    }
    return false;
};

Controller.wantsToChangeName = function()
{
    var url_string = window.location.href;
    var url = new URL(url_string);
    var c = url.searchParams.get("changeName");
    return !!c;
};

Controller.getGameId = function()
{
    var url_string = window.location.href;
    var url = new URL(url_string);
    return url.searchParams.get("gameId");
};

Controller.playerAdded = function(playerAdded)
{
    View.renderPlayers([playerAdded.player]);
    if (playerAdded.player.playerId !== Controller.playerId) {
        return;
    }
    if (playerAdded.isAdmin) {
        View.enableAdminControls();
    } else {
        View.disableAdminControls();
    }
};

Controller.roundStarted = function(round)
{
    View.clearTable();
    View.unhighlightWinner();
    View.renderPlayers(round.players, Controller.playerId);

    var playersWithChips = round.players.filter(player => {
       return player.chips > 0;
    });

    View.renderDownFacingHands(playersWithChips);
    View.highlightDealer(round.dealer);
};

Controller.playerDealtHand = function(playerDealtHand)
{
    console.log(playerDealtHand);
    View.renderPlayerHand(playerDealtHand.hand);
};

Controller.winnerByDefault = function(winner)
{
    View.disableFoldButton();
    View.highlightWinner(winner.hand.playerId);
    View.updatePlayerStack(winner.hand.playerId, winner.playerChips);
    View.emptyPot();
    View.disableBetting();
    View.showDealButton();
};

Controller.winningHand = function(winner)
{
    View.renderPlayerHand(winner.hand);
    View.disableFoldButton();
    View.highlightWinner(winner.hand.playerId);
    View.updatePlayerStack(winner.hand.playerId, winner.playerChips);
    View.emptyPot();
    View.disableBetting();
    View.showDealButton();
};

Controller.playersTurn = function(playersTurn)
{
    if (playersTurn.playerId === Controller.playerId) {
        View.enableFoldButton();
        View.enableBetting(playersTurn.amountToPlay);
    } else {
        View.disableFoldButton();
        View.disableBetting();
    }
    View.highlightPlayerToAct(playersTurn.playerId);
};

Controller.givePlayerChips = function()
{
    var playerId = $('#player_ids').val();
    var amount = parseInt($('#chips-to-give').val());

    Game.giveChipsToPlayer(playerId, amount);

    $('#chips-to-give').val('');
};

var View = {};

View.renderPlayers = function(players, currentPlayerId)
{
    var $playerIds = $('#player_ids');
    $playerIds.html('<option value="">(Choose player)</option>');

    for (var index in players) {
        var player = players[index];
        if (player.playerId) {
            View.renderSeat(player.seat, player.playerId, player.playerName, player.chips, currentPlayerId);
            $playerIds.append('<option value="' + player.playerId + '">' + player.playerName + '</option>');
        } else {
            View.renderEmptySeat(player.seat);
        }
    }
};

View.renderEmptySeats = function()
{
    for (var i = 0; i < 8; i++) {
        View.renderEmptySeat(i);
    }
};

View.renderSeat = function(seat, playerId, playerName, chips, currentPlayerId)
{
    var title = (seat + 1) + ": " + playerName;
    if (playerId === currentPlayerId) {
        title = "<b>" + title + "</b>";
    }

    var $seat = $(`#seat-${seat}`);
    if ($seat.length) {
        $seat.removeClass('empty');
        $seat.find('.name').html(title);
        $seat.find('.cards').attr('id', 'player-' + playerId);
        $seat.removeClass('empty');
        $seat.find('.stack').show().text(chips);
        return;
    }

    var seatHtml =
        "<div id='seat-" + seat + "' class='seat'>" +
            "<div class='name'>" + title + "</div>" +
            "<span class='cards' id='player-" + playerId + "'></span>" +
            "<span class='chips stack'>" + chips + "</span>" +
        "</div>";

    View.getHandsDiv(seat).append(seatHtml);
};

View.renderEmptySeat = function(seat)
{
    var title = (seat + 1) + ": (empty)";

    var $seat = $(`#seat-${seat}`);
    if ($seat.length) {
        $seat.addClass('empty');
        $seat.find('.name').html(title);
        $seat.find('.cards').html('');
        $seat.find('.stack').hide();
        return;
    }

    var seatHtml =
        "<div id='seat-" + seat + "' class='seat empty'>" +
            "<div class='name'>" + title + "</div>" +
            "<span class='cards'></span>" +
            "<span class='chips stack' style='display: none'></span>" +
        "</div>";

    View.getHandsDiv(seat).append(seatHtml);
};

View.getHandsDiv = function(seat)
{
    if (seat < 4) {
        return $('#seats-1-to-4');
    }
    return $('#seats-5-to-8');
};

View.renderPlayerHand = function(hand)
{
    var handHtml = View.renderCards(hand.cards);
    $('#player-' + hand.playerId).html(handHtml);
};

View.removeCards = function(playerIds)
{
    playerIds.map(playerId => {
        $('#player-' + playerId + ' .card').remove();
    });
};

View.foldPlayerHand = function(playerFolded)
{
    $('#player-' + playerFolded.playerId + ' .card').each(function(){
        $(this).addClass('grey');
    });
};

View.renderDownFacingHands = function(players)
{
    players.map(player => {
        var hand = [View.renderDownFacingCard(), View.renderDownFacingCard()];
        $('#player-' + player.playerId).html(hand);
    });
};

View.attachCommunityCards = function(flopDealt)
{
    $('#cards').html(View.renderCards(flopDealt.cards));
};

View.attachTurn = function(turn)
{
    $('#cards').html( $('#cards').html() + View.renderCards([turn.card]));
};

View.attachRiver = function(river)
{
    $('#cards').html( $('#cards').html() + View.renderCards([river.card]));
};

View.clearTable = function()
{
    $('#cards').html('');
    $('.card').remove();
};

View.renderCards = function(cards)
{
    return cards.map(function(card){
        return View.renderCard(card);
    });
};

View.renderCard = function(card)
{
    return '<img src="images/' + card + '.png" class="card"/>';
};

View.renderDownFacingCard = function()
{
    return '<img src="/images/back.png" class="card"/>';
};

View.highlightWinner = function(playerId)
{
    $('.turn').removeClass('turn');
    var $seat = $('#player-' + playerId).parent('.seat');
    $seat.addClass('winner');
};

View.unhighlightWinner = function()
{
    $('.winner').removeClass('winner');
};

View.highlightDealer = function(playerId)
{
    $('.dealer').remove();
    var dealerHtml = "<div class='dealer'>D</div>";
    $('#player-' + playerId).parent('.seat').append(dealerHtml);
};

View.enableAdminControls = function()
{
    $("#admin-controls").show();
};

View.disableAdminControls = function()
{
    $("#admin-controls").hide();
};

View.showFlopButton = function()
{
    View.hideCommunityCardsButtons();
    $('#flop').show();
};

View.showTurnButton = function()
{
    View.hideCommunityCardsButtons();
    $('#turn').show();
};

View.showRiverButton = function()
{
    View.hideCommunityCardsButtons();
    $('#river').show();
};

View.showFinishButton = function()
{
    View.hideCommunityCardsButtons();
    $('#finish').show();
};

View.showDealButton = function()
{
    View.hideCommunityCardsButtons();
    $('#deal').show();
};

View.hideCommunityCardsButtons = function()
{
    $('#community-cards button').hide();
};

View.disableFoldButton = function()
{
    $('#fold').attr('disabled', 'disabled');
};

View.enableFoldButton = function()
{
    $('#fold').removeAttr('disabled');
};

View.showBet = function(bet)
{
    console.log(bet);
    var betTotal = bet.total === 0 ? "check" : bet.total;
    var $seat = $('#player-' + bet.playerId).parent('.seat');
    $seat.find('.stack').text(bet.remainingChips);
    $seat.find('.bet').remove();
    $seat.append('<div class="chips bet">' + betTotal + '</div>')
};

View.updatePlayerStack = function(playerId, chips)
{
    var $seat = $('#player-' + playerId).parent('.seat');
    $seat.find('.stack').text(chips);
};

View.clearBets = function()
{
    $('.seat .bet').remove();
};

View.updatePot = function(potTotal)
{
    View.clearBets();
    $('#pot').show().text(potTotal.amount);
};

View.emptyPot = function()
{
    View.clearBets();
    $('#pot').hide();
};

View.highlightPlayerToAct = function(playerId)
{
    $('.turn').removeClass('turn');
    if (!playerId){
        return;
    }
    var $seat = $('#player-' + playerId).parent('.seat');
    $seat.addClass('turn');
};

View.disableBetting = function() {
    $('#bet').attr('disabled', 'disabled');
};

View.enableBetting = function(minAmount)
{
    $('#amount').attr('min', minAmount);
    if (minAmount > 0) {
        $('#amount').val(minAmount);
    }

    $('#bet').removeAttr('disabled');
};

View.existingSession = function()
{
    alert("Other tab/window already opened on this machine. Please go to the active tab/window to play.");
};

var Bootstrapper = {};

Bootstrapper.boot = function()
{
    var gameId = Controller.getGameId();
    if (!gameId) {
        window.location.href = window.location.href + "?gameId=" + uuidv4();
        return;
    }

    var socket = io(window.location.href);

    Bootstrapper.attachHtmlEventListeners();
    Bootstrapper.attachSocketEventListeners(socket);
    View.renderEmptySeats();

    socket.on('connect', function() {
        Game.bootClient(gameId, socket.id);
        Controller.joinGame();
    });
};

Bootstrapper.attachHtmlEventListeners = function()
{
    $("#deal").click(function(){
        Controller.startGame();
    });
    $("#flop").click(function(){
        Controller.dealFlop();
    });
    $("#turn").click(function(){
        Controller.dealTurn();
    });
    $("#river").click(function(){
        Controller.dealRiver();
    });
    $("#finish").click(function(){
        Controller.finishRound();
    });
    $("#fold").click(function(){
        Controller.foldHand();
    });
    $("#give-chips").click(function(){
        Controller.givePlayerChips();
    });
    $('#bet').click(function(){
        Controller.placeBet();
    });
};

Bootstrapper.attachSocketEventListeners = function(socket)
{
    Controller.eventHandlers = {
        'playerAdded': Controller.playerAdded,
        'roundStarted': Controller.roundStarted,
        'playerDealtHand': Controller.playerDealtHand,
        'winningHand': Controller.winningHand,
        'winnerByDefault': Controller.winnerByDefault,
        'flopDealt': View.attachCommunityCards,
        'turnDealt': View.attachTurn,
        'riverDealt': View.attachRiver,
        'playerFolded': View.foldPlayerHand,
        'betMade': View.showBet,
        'potTotal': View.updatePot,
        'playersTurn': Controller.playersTurn,
        'existingSession': View.existingSession,
    };

    for (var event in Controller.eventHandlers) {
        socket.on(event, Controller.eventHandlers[event]);
    }
};