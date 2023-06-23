/// <reference path="../csgo.d.ts" />
var SessionUtil = (function () {
    const _DoesGameModeHavePrimeQueue = function (gameModeSettingName) {
        const bPrimeQueueSupported = (gameModeSettingName === 'competitive' || gameModeSettingName === 'scrimcomp2v2' || gameModeSettingName === 'survival');
        return bPrimeQueueSupported;
    };
    const _GetMaxLobbySlotsForGameMode = function (gameMode) {
        let numLobbySlots = 5;
        if (gameMode == "scrimcomp2v2" ||
            gameMode == "cooperative" ||
            gameMode == "coopmission")
            numLobbySlots = 2;
        else if (gameMode === "survival")
            numLobbySlots = 2;
        return numLobbySlots;
    };
    const _AreLobbyPlayersPrime = function () {
        const playersCount = PartyListAPI.GetCount();
        for (let i = 0; i < playersCount; i++) {
            const xuid = PartyListAPI.GetXuidByIndex(i);
            const isFriendPrime = PartyListAPI.GetFriendPrimeEligible(xuid);
            if (isFriendPrime === false) {
                return false;
            }
        }
        return true;
    };
    const _GetNumWinsNeededForRank = function (skillgroupType) {
        if (skillgroupType.toLowerCase() === 'survival')
            return 0;
        if (skillgroupType.toLowerCase() === 'dangerzone')
            return 0;
        return 10;
    };
    return {
        DoesGameModeHavePrimeQueue: _DoesGameModeHavePrimeQueue,
        GetMaxLobbySlotsForGameMode: _GetMaxLobbySlotsForGameMode,
        AreLobbyPlayersPrime: _AreLobbyPlayersPrime,
        GetNumWinsNeededForRank: _GetNumWinsNeededForRank
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Vzc2lvbnV0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZXNzaW9udXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxQ0FBcUM7QUFJckMsSUFBSSxXQUFXLEdBQUcsQ0FBRTtJQUVuQixNQUFNLDJCQUEyQixHQUFHLFVBQVUsbUJBQTJCO1FBUXhFLE1BQU0sb0JBQW9CLEdBQUcsQ0FBRSxtQkFBbUIsS0FBSyxhQUFhLElBQUksbUJBQW1CLEtBQUssY0FBYyxJQUFJLG1CQUFtQixLQUFLLFVBQVUsQ0FBRSxDQUFDO1FBQ3ZKLE9BQU8sb0JBQW9CLENBQUM7SUFDN0IsQ0FBQyxDQUFDO0lBRUYsTUFBTSw0QkFBNEIsR0FBRyxVQUFVLFFBQWdCO1FBSTlELElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQztRQUN0QixJQUFLLFFBQVEsSUFBSSxjQUFjO1lBQzlCLFFBQVEsSUFBSSxhQUFhO1lBQ3pCLFFBQVEsSUFBSSxhQUFhO1lBQ3pCLGFBQWEsR0FBRyxDQUFDLENBQUM7YUFDZCxJQUFLLFFBQVEsS0FBSyxVQUFVO1lBQ2hDLGFBQWEsR0FBRyxDQUFDLENBQUM7UUFDbkIsT0FBTyxhQUFhLENBQUM7SUFDdEIsQ0FBQyxDQUFDO0lBRUYsTUFBTSxxQkFBcUIsR0FBRztRQUU3QixNQUFNLFlBQVksR0FBRyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7UUFFN0MsS0FBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFlBQVksRUFBRSxDQUFDLEVBQUUsRUFDdEM7WUFDQyxNQUFNLElBQUksR0FBRyxZQUFZLENBQUMsY0FBYyxDQUFFLENBQUMsQ0FBRSxDQUFDO1lBQzlDLE1BQU0sYUFBYSxHQUFHLFlBQVksQ0FBQyxzQkFBc0IsQ0FBRSxJQUFJLENBQUUsQ0FBQztZQUVsRSxJQUFLLGFBQWEsS0FBSyxLQUFLLEVBQzVCO2dCQUNDLE9BQU8sS0FBSyxDQUFDO2FBQ2I7U0FDRDtRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQyxDQUFDO0lBRUYsTUFBTSx3QkFBd0IsR0FBRyxVQUFVLGNBQXNCO1FBRWhFLElBQUssY0FBYyxDQUFDLFdBQVcsRUFBRSxLQUFLLFVBQVU7WUFBRyxPQUFPLENBQUMsQ0FBQztRQUM1RCxJQUFLLGNBQWMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxZQUFZO1lBQUcsT0FBTyxDQUFDLENBQUM7UUFDOUQsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDLENBQUM7SUFFRixPQUFNO1FBQ0wsMEJBQTBCLEVBQUcsMkJBQTJCO1FBQ3hELDJCQUEyQixFQUFFLDRCQUE0QjtRQUN6RCxvQkFBb0IsRUFBRSxxQkFBcUI7UUFDM0MsdUJBQXVCLEVBQUcsd0JBQXdCO0tBQ2xELENBQUM7QUFDSCxDQUFDLENBQUMsRUFBRSxDQUFDIn0=