class Todo {
    #id = 0;
    text = "";
    #finished = false;

    constructor(id, text) {
        this.#id = id
        this.text = text;
    }

    complete = function() {
        this.#finished = true;
    }

    get id() {
        return this.#id;
    }
    get finished() {
        return this.#finished;
    }
    set finished(value) {
        this.#finished = value;
    }
}

class TodoHTML extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const finishedClass = this.todo.finished ? "finished" : "";
        const draggable = this.todo.finished ? false : true
        this.innerHTML = `
            <div draggable="${draggable}" class="todo ${finishedClass}" data-id="${this.todo.id}">
                <div class="text${this.todo.id} todo-text">${this.todo.text}</div>
                <button title="Mark as done" id="confirmButton${this.todo.id}" class="confirm-button">✅</button>
                <button title="Edit text" id="editButton${this.todo.id}" class="edit-button">✏️</button>
                <button title="Remove" id="cancelButton${this.todo.id}" class="cancel-button">❎</button>
                <input title="Select" id="checkbox${this.todo.id}" type="checkbox" class="todo-checkbox" />
            </div>
        `;
    }
}
customElements.define("todo-html", TodoHTML);

let todos = [];
const completedIds = [];
const selectedIds = [];
let hiddenComletedButton = true;
let draggedId = null;


function updateReactive() {
    const container = document.querySelector(".todos-container");
    container.textContent = "";
    const menuToAppend = document.querySelectorAll("menu")[1];
    
    const hideButton = document.querySelector(".hide-completed-button");
    menuToAppend.textContent = "";
    
    menuToAppend.appendChild(hideButton);

    todos.forEach((todo) => {
        const todoHTML = document.createElement("todo-html");
        todoHTML.todo = todo;
        if (todo.finished) {
            menuToAppend.appendChild(todoHTML);
        }
        else {
            container.appendChild(todoHTML)
        }

        setTimeout(() => {
            if (selectedIds.includes(todo.id)) document.getElementById(`checkbox${todo.id}`).checked = true;
            document.getElementById(`confirmButton${todo.id}`).addEventListener("click", () => (completeTodo(todo.id)));
            document.getElementById(`editButton${todo.id}`).addEventListener("click", () => (editTodo(todo.id)));
            document.getElementById(`cancelButton${todo.id}`).addEventListener("click", () => (deleteTodo(todo.id)));
            document.getElementById(`checkbox${todo.id}`).addEventListener("change", (event) => {
                if (event.target.checked)
                    selectedIds.push(todo.id);
                else {
                    const foundIdx = selectedIds.findIndex(id => id === todo.id);
                    if (foundIdx !== -1) {
                        selectedIds.splice(foundIdx, 1);
                    }
                }
            });
        }, 0);
    })
    
    const buttonHide = menuToAppend.firstElementChild;
    if (buttonHide && buttonHide instanceof HTMLButtonElement) {
        if (hiddenComletedButton) {
            buttonHide.textContent = "Show completed";
            menuToAppend.childNodes.forEach(node => {
                if (!(node instanceof HTMLButtonElement)) {
                    node.style.display = "none";
                }
            });
        }
        else {
            buttonHide.textContent = "Hide completed";
            menuToAppend.childNodes.forEach(node => {
                if (!(node instanceof HTMLButtonElement)) {
                    node.style.display = "block";
                }
            });
        }
    }
    enableDragAndDrop();
    return;
}

function enableDragAndDrop() {
    const todoElems = document.querySelectorAll(".todo");

    todoElems.forEach((todo) => {
        todo.addEventListener("dragstart", (event) => {
            draggedId = Number(todo.dataset.id);
            todo.classList.add("dragging");
            event.dataTransfer.effectAllowed = "move";
        })
        todo.addEventListener("dragend", () => {
            draggedId = null;
            todo.classList.remove("dragging");
        })
        todo.addEventListener("dragover", (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
        })
        todo.addEventListener("drop", (event) => {
            event.preventDefault();
            const targetId = Number(todo.dataset.id);
            if (draggedId !== null && draggedId !== targetId) {
                const fromIndex = todos.findIndex(todo => todo.id === draggedId);
                const toIndex = todos.findIndex(todo => todo.id === targetId);

                const [movedTodo] = todos.splice(fromIndex, 1);
                todos.splice(toIndex, 0, movedTodo);

                updateReactive();
            }
        })
    })

}

function completeTodo(id) {
    const foundTodoIndex = todos.findIndex(todo => todo.id === id);
    if (foundTodoIndex !== -1) {
        const todo = todos[foundTodoIndex];
        if (todo.finished) {
            alert("Already completed!");
            return;
        }
        todo.complete();
        completedIds.push(todo.id);
        updateReactive();
    }
    return;
}

function editTodo(id) {
    const todo = todos.find(todo => todo.id === id);
    const foundTextDiv = document.querySelector(`.text${id}`);
    if (!foundTextDiv) return;

    const newInput = document.createElement("textarea");
    newInput.type = "text";
    newInput.value = todo.text;
    newInput.classList.add("blank", "input-editing");
    foundTextDiv.replaceWith(newInput);
    newInput.focus();

    function save() {
        const value = newInput.value.trim();
        if (value) {
            todo.text = value;
        }
        updateReactive();
    }
    newInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            save();
        }
        else if (event.key === "Escape") {
            updateReactive();
        }
    })
    newInput.addEventListener("blur", save);
}

function deleteTodo(id) {
    const foundTodoIndex = todos.findIndex(todo => todo.id === id);
    if (foundTodoIndex !== -1) {
        todos.splice(foundTodoIndex, 1);
        updateReactive();
    }
    const foundInCompleted = completedIds.findIndex(todo_id => todo_id === id);
    if (foundInCompleted !== -1) {
        completedIds.splice(foundInCompleted, 1);
    }
    return;
}

const idCreator = function () {
    let count = 0;
    return {
        generate: function() {
            return count++;
        }
    }
}();

function addNewTodo(id, text) {
    todos.push( new Todo(id, text) );
    updateReactive();
    return;
}

function createEmptyContainer() {
    const todoContainer = document.createElement("div");
    todoContainer.innerHTML = `
        <form>
            <textarea id="textareaBlank" spellcheck="true" lang="en" placeholder="What will we do?"></textarea>
        </form>
    `;
    todoContainer.classList.add("todo", "blank");
    document.querySelector(".todos-container").appendChild(todoContainer);

    let handled = false;

    function handleExit(textArea) {
        if (handled) return;
        handled = true;
        const textareaValue = textArea.value;
        if (!!textareaValue) {
            const id = idCreator.generate();
            addNewTodo(id, textareaValue);
        }
        if (todoContainer && todoContainer.parentNode)
            document.querySelector(".todos-container").removeChild(todoContainer);
    }

    const textArea = document.getElementById(`textareaBlank`);
    textArea.focus();
    textArea.addEventListener("keydown", (event) => {
        if (event.key === 'Enter' || event.key === 'Escape') {
            handleExit(textArea);
        }
    })
    textArea.addEventListener("blur", () => {
        handleExit(textArea);
    })
    return;
};

document.querySelector(".new-todo-button").addEventListener("click", () => {
    createEmptyContainer();
});
document.querySelector(".mark-as-completed-button").addEventListener("click", () => {
    if (selectedIds.length === 0) {
        alert("First, choose todos!");
    }
    todos.forEach(todo => {
        if (selectedIds.includes(todo.id)) {
            completeTodo(todo.id);
        }
    })
    selectedIds.length = 0;
});
document.querySelector(".delete-todo-button").addEventListener("click", () => {
    if (selectedIds.length === 0) {
        alert("First, choose todos!");
    }
    selectedIds.forEach((id) => {
        deleteTodo(id)
    })
    selectedIds.length = 0;
    updateReactive();
});
document.querySelector(".clear-finished-todos-button").addEventListener("click", () => {
    if (completedIds.length === 0) {
        alert("Nothing completed!");
    }
    todos = todos.filter(todo => !todo.finished);
    completedIds.length = 0;
    updateReactive();
});
document.querySelector(".clear-all-todos-button").addEventListener("click", () => {
    if (todos.length === 0) {
        alert("Nothing deleted!");
    }
    todos.length = 0;
    completedIds.length = 0;
    selectedIds.length = 0;
    updateReactive();
});

document.querySelector(".hide-completed-button").addEventListener("click", () => {
    hiddenComletedButton = !hiddenComletedButton;
    updateReactive();
});
updateReactive();