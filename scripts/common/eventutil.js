/// <reference path="../csgo.d.ts" />
var CEventUtil = class {
    _eventIdSet = new Set();
    constructor() {
        const officialEventIds = [
            5277,
            5278,
            5279,
            5281,
            5282,
            5356,
            5339,
            5338,
            5376,
            5500,
            5506,
            5465,
            5464,
            5937,
            5967,
            4866,
            6207,
        ];
        for (const id of officialEventIds) {
            this._eventIdSet.add(id.toString());
        }
    }
    AnnotateOfficialEvents = (jsonEvents) => {
        for (let event of jsonEvents) {
            if (this._eventIdSet.has(event.event_id)) {
                event.is_official = true;
            }
        }
        return jsonEvents;
    };
};
var EventUtil = EventUtil ?? new CEventUtil();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnR1dGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXZlbnR1dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFDQUFxQztBQVVyQyxJQUFJLFVBQVUsR0FBRztJQUVSLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO0lBRXhDO1FBVUMsTUFBTSxnQkFBZ0IsR0FBRztZQUd4QixJQUFJO1lBQ0osSUFBSTtZQUNKLElBQUk7WUFDSixJQUFJO1lBQ0osSUFBSTtZQUdKLElBQUk7WUFDSixJQUFJO1lBQ0osSUFBSTtZQUNKLElBQUk7WUFHSixJQUFJO1lBQ0osSUFBSTtZQUNKLElBQUk7WUFDSixJQUFJO1lBR0osSUFBSTtZQUNKLElBQUk7WUFHSixJQUFJO1lBQ0osSUFBSTtTQUNKLENBQUM7UUFDRixLQUFNLE1BQU0sRUFBRSxJQUFJLGdCQUFnQixFQUNsQztZQUNDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFFLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBRSxDQUFDO1NBQ3RDO0lBQ0YsQ0FBQztJQUVELHNCQUFzQixHQUFHLENBQTZCLFVBQWUsRUFBUSxFQUFFO1FBRTlFLEtBQU0sSUFBSSxLQUFLLElBQUksVUFBVSxFQUM3QjtZQUNDLElBQUssSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBRSxFQUMzQztnQkFDQyxLQUFLLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQzthQUN6QjtTQUNEO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDbkIsQ0FBQyxDQUFDO0NBQ0YsQ0FBQztBQUVGLElBQUksU0FBUyxHQUFnQyxTQUFVLElBQUksSUFBSSxVQUFVLEVBQUUsQ0FBQyJ9