"use strict";
/// <reference path="../csgo.d.ts" />
var CFormattedText = class {
    tag;
    vars;
    constructor(strLocTag, mapDialogVars) {
        this.tag = strLocTag;
        this.vars = Object.assign({}, mapDialogVars);
    }
    SetOnLabel(elLabel) {
        FormatText.SetFormattedTextOnLabel(elLabel, this);
    }
};
var FormatText = (function () {
    const _FormatPluralLoc = function (sLocToken, nQuantity, nPrecision = 0) {
        let sText = $.Localize(sLocToken, nQuantity, nPrecision);
        return sText.replace(/%s1/g, nQuantity.toFixed(nPrecision));
    };
    const _SetFormattedTextOnLabel = function (elLabel, fmtText) {
        _ClearFormattedTextFromLabel(elLabel);
        elLabel.text = fmtText.tag;
        elLabel.fmtTextVars = {};
        for (const varName in fmtText.vars) {
            elLabel.SetDialogVariable(varName, elLabel.html ? $.HTMLEscape(fmtText.vars[varName]) : fmtText.vars[varName]);
            elLabel.fmtTextVars[varName] = true;
        }
    };
    const _ClearFormattedTextFromLabel = function (elLabel) {
        elLabel.text = '';
        if (!elLabel.fmtTextVars)
            return;
        for (const varName in elLabel.fmtTextVars) {
            elLabel.SetDialogVariable(varName, '');
        }
        delete elLabel.fmtTextVars;
    };
    const _SecondsToDDHHMMSSWithSymbolSeperator = function (rawSeconds) {
        const time = _ConvertSecondsToDaysHoursMinSec(rawSeconds);
        const timeText = [];
        let returnRemaining = false;
        for (const key in time) {
            const value = time[key];
            if ((value > 0 && !returnRemaining) || key == 'minutes')
                returnRemaining = true;
            if (returnRemaining) {
                const valueToShow = (value < 10) ? ('0' + value.toString()) : value.toString();
                timeText.push(valueToShow);
            }
        }
        return timeText.join(':');
    };
    const _SecondsToSignificantTimeString = function (rawSeconds) {
        rawSeconds = Math.floor(Number(rawSeconds));
        if (rawSeconds < 60)
            return _FormatPluralLoc('#SFUI_Store_Timer_Min:p', 1);
        const time = _ConvertSecondsToDaysHoursMinSec(rawSeconds);
        let numComponentsReturned = 0;
        let strResult = '';
        for (const key in time) {
            const value = time[key];
            if (key == 'seconds')
                break;
            let bAppendThisComponent = false;
            const bFinishedAfterThisComponent = (numComponentsReturned > 0);
            if (value > 0) {
                bAppendThisComponent = true;
            }
            if (bAppendThisComponent) {
                if (bFinishedAfterThisComponent)
                    strResult += ' ';
                let lockey;
                if (key == 'minutes')
                    lockey = '#SFUI_Store_Timer_Min:p';
                else if (key == 'hours')
                    lockey = '#SFUI_Store_Timer_Hour:p';
                else
                    lockey = '#SFUI_Store_Timer_Day:p';
                strResult += _FormatPluralLoc(lockey, value);
                ++numComponentsReturned;
            }
            if (bFinishedAfterThisComponent)
                break;
        }
        return strResult;
    };
    const _ConvertSecondsToDaysHoursMinSec = function (rawSeconds) {
        rawSeconds = Number(rawSeconds);
        const time = {
            days: Math.floor(rawSeconds / 86400),
            hours: Math.floor((rawSeconds % 86400) / 3600),
            minutes: Math.floor(((rawSeconds % 86400) % 3600) / 60),
            seconds: ((rawSeconds % 86400) % 3600) % 60
        };
        return time;
    };
    const _PadNumber = function (integer, digits, char = '0') {
        integer = integer.toString();
        while (integer.length < digits)
            integer = char + integer;
        return integer;
    };
    const _SplitAbbreviateNumber = function (number, fixed = 0) {
        if (number < 0)
            return -1;
        let pow10 = Math.log10(number) | 0;
        let stringToken = "";
        const locFilePrefix = "#NumberAbbreviation_suffix_E";
        do {
            stringToken = locFilePrefix + [pow10];
            if ($.Localize(stringToken) != stringToken)
                break;
        } while (--pow10 > 0);
        if ($.Localize(stringToken) == stringToken)
            return [number.toString(), ''];
        const scale = Math.pow(10, pow10);
        const scaledNumber = number / scale;
        const decimals = scaledNumber < 10.0 ? 1 : 0;
        const finalNum = scaledNumber.toFixed(fixed).replace(/\.0+$/, '');
        return [finalNum, $.Localize(stringToken)];
    };
    const _AbbreviateNumber = function (number) {
        if (number < 0)
            return -1;
        let pow10 = Math.log10(number) | 0;
        let stringToken = "";
        const locFilePrefix = "#NumberAbbreviation_E";
        function _IsLocalizationValid(symbol) {
            return (symbol === "");
        }
        do {
            stringToken = locFilePrefix + [pow10];
            if (_IsLocalizationValid($.Localize(stringToken, $.GetContextPanel())))
                break;
        } while (--pow10 > 0);
        if (!_IsLocalizationValid($.Localize(stringToken, $.GetContextPanel())))
            return number.toString();
        const scale = Math.pow(10, pow10);
        const scaledNumber = number / scale;
        const decimals = scaledNumber < 10.0 ? 1 : 0;
        const finalNum = scaledNumber.toFixed(decimals).replace(/\.0+$/, '');
        $.GetContextPanel().SetDialogVariable('abbreviated_number', finalNum);
        const result = $.Localize(stringToken, $.GetContextPanel());
        return result;
    };
    function _CapitalizeFirstLetterOfEachWord(sentence) {
        return sentence.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }
    function _ForceSign(num) {
        if (Number(num) >= 0)
            return '+' + num;
        else
            return String(num);
    }
    return {
        FormatPluralLoc: _FormatPluralLoc,
        SetFormattedTextOnLabel: _SetFormattedTextOnLabel,
        ClearFormattedTextFromLabel: _ClearFormattedTextFromLabel,
        SecondsToDDHHMMSSWithSymbolSeperator: _SecondsToDDHHMMSSWithSymbolSeperator,
        SecondsToSignificantTimeString: _SecondsToSignificantTimeString,
        PadNumber: _PadNumber,
        AbbreviateNumber: _AbbreviateNumber,
        SplitAbbreviateNumber: _SplitAbbreviateNumber,
        CapitalizeFirstLetterOfEachWord: _CapitalizeFirstLetterOfEachWord,
        ForceSign: _ForceSign,
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0dGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZvcm1hdHRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFDQUFxQztBQTRCckMsSUFBSSxjQUFjLEdBQUc7SUFFcEIsR0FBRyxDQUFTO0lBQ1osSUFBSSxDQUFxQjtJQUV6QixZQUFhLFNBQWlCLEVBQUUsYUFBaUM7UUFFaEUsSUFBSSxDQUFDLEdBQUcsR0FBRyxTQUFTLENBQUM7UUFHckIsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFFLEVBQUUsRUFBRSxhQUFhLENBQUUsQ0FBQztJQUNoRCxDQUFDO0lBRUQsVUFBVSxDQUFHLE9BQWdCO1FBRTVCLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBRSxPQUFPLEVBQUUsSUFBSSxDQUFFLENBQUM7SUFDckQsQ0FBQztDQUNELENBQUM7QUFFRixJQUFJLFVBQVUsR0FBRyxDQUFFO0lBRWxCLE1BQU0sZ0JBQWdCLEdBQUcsVUFBVyxTQUFpQixFQUFFLFNBQWlCLEVBQUUsYUFBcUIsQ0FBQztRQUUvRixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFFLENBQUM7UUFDM0QsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsT0FBTyxDQUFFLFVBQVUsQ0FBRSxDQUFFLENBQUM7SUFDakUsQ0FBQyxDQUFBO0lBRUQsTUFBTSx3QkFBd0IsR0FBRyxVQUFXLE9BQXVCLEVBQUUsT0FBbUQ7UUFFdkgsNEJBQTRCLENBQUUsT0FBTyxDQUFFLENBQUM7UUFFeEMsT0FBTyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO1FBQzNCLE9BQU8sQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLEtBQU0sTUFBTSxPQUFPLElBQUksT0FBTyxDQUFDLElBQUksRUFDbkM7WUFDQyxPQUFPLENBQUMsaUJBQWlCLENB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