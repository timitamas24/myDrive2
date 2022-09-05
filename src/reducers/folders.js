export default (state = [], action) => {
    
    switch(action.type) {

        case "ADD_FOLDER": 

            return [
                action.folder,
                ...state
            ]

        case "EDIT_FOLDER":

            return state.map((folder) => {

                if (folder._id === action.id) {

                    return {...folder, ...action.folder}

                } else {

                    return folder
                }
            })

        case "SET_FOLDERS":

            return action.folders;

        case "REMOVE_FOLDER":

            return state.filter((folder) => {
                return action.id !== folder._id;
            })

        case "LOCK_FOLDER":
            console.log(state);
            console.log(action);
            return state.map((folder) => {
                if (folder._id === action.in){
                    return {...folder, lockUntil: action.until};
                } else {
                    return folder;
                }
            })

        default:
            return state;
    }
}