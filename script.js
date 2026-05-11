const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const prioritySelect = document.getElementById("todo-priority");
const dueDateInput = document.getElementById("todo-due-date");
const list = document.getElementById("todo-list");
const newListButton = document.getElementById("new-list-button");
const todoListsElement = document.getElementById("todo-lists");
const activeListTitle = document.getElementById("active-list-title");
const deleteListButton = document.getElementById("delete-list-button");
const markAllButton = document.getElementById("mark-all-button");
const clearButton = document.getElementById("clear-button");
const LIST_STORAGE_KEY = "accountabilityTodoLists";
const ACTIVE_LIST_STORAGE_KEY = "accountabilityActiveTodoListId";
const LEGACY_TASK_STORAGE_KEY = "accountabilityTodoTasks";
const MAX_DELETED_TASKS = 3;

let todoLists = loadTodoLists();
let activeListId = loadActiveListId(todoLists);
let deletedTasks = [];

renderTodoLists();
renderTasks();

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const taskText = input.value.trim();

  if (taskText === "") {
    return;
  }

  addTask(taskText, prioritySelect.value, dueDateInput.value);
  input.value = "";
  dueDateInput.value = "";
});

newListButton.addEventListener("click", function () {
  const newList = {
    id: createListId(),
    name: getNextListName(),
    tasks: [],
  };

  todoLists.unshift(newList);
  activeListId = newList.id;
  deletedTasks = [];
  saveTasks();
  saveActiveListId();
  renderTodoLists();
  renderTasks();
});

deleteListButton.addEventListener("click", function () {
  deleteActiveList();
});

function addTask(taskText, priority = "Medium", dueDate = "") {
  const task = {
    id: createTaskId(),
    text: taskText,
    priority,
    dueDate,
    completed: false,
  };

  getActiveTasks().push(task);
  saveTasks();
  renderTodoLists();
  renderTasks();
}

function renderTodoLists() {
  todoListsElement.innerHTML = "";

  todoLists.forEach(function (todoList) {
    const listItem = document.createElement("li");

    const listButton = document.createElement("button");
    listButton.type = "button";
    listButton.className = "list-nav-button";
    listButton.textContent = todoList.name;

    if (todoList.id === activeListId) {
      listButton.classList.add("active");
    }

    const taskCount = document.createElement("span");
    taskCount.className = "list-task-count";
    taskCount.textContent = String(todoList.tasks.length);

    listButton.appendChild(taskCount);

    listButton.addEventListener("click", function () {
      activeListId = todoList.id;
      deletedTasks = [];
      saveActiveListId();
      renderTodoLists();
      renderTasks();
    });

    listItem.appendChild(listButton);
    todoListsElement.appendChild(listItem);
  });
}

function renderTasks() {
  const activeList = getActiveList();
  activeListTitle.textContent = activeList.name;
  list.innerHTML = "";

  activeList.tasks.forEach(function (task) {
    list.appendChild(createTaskElement(task));
  });
}

function getActiveList() {
  const activeList = todoLists.find(function (todoList) {
    return todoList.id === activeListId;
  });

  if (activeList !== undefined) {
    return activeList;
  }

  activeListId = todoLists[0].id;
  saveActiveListId();
  return todoLists[0];
}

function getActiveTasks() {
  return getActiveList().tasks;
}

function deleteActiveList() {
  const activeList = getActiveList();
  const shouldDeleteList = confirm(
    `Are you sure you want to delete "${activeList.name}"? This will delete all tasks in this list.`
  );

  if (!shouldDeleteList) {
    return;
  }

  const deletedListIndex = todoLists.findIndex(function (todoList) {
    return todoList.id === activeList.id;
  });

  todoLists.splice(deletedListIndex, 1);

  if (todoLists.length === 0) {
    todoLists.push({
      id: createListId(),
      name: "Main List",
      tasks: [],
    });
  }

  const nextActiveIndex = Math.min(deletedListIndex, todoLists.length - 1);
  activeListId = todoLists[nextActiveIndex].id;
  deletedTasks = [];
  saveTasks();
  saveActiveListId();
  renderTodoLists();
  renderTasks();
}

function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = "task-grid task-row";
  li.dataset.id = task.id;
  li.dataset.priority = task.priority;

  if (task.dueDate !== "") {
    li.dataset.dueDate = task.dueDate;
    li.classList.add(`task-due-${getDueDateStatus(task.dueDate)}`);
  }

  const titleCell = document.createElement("div");
  titleCell.className = "task-title-cell";

  const completedCheckbox = document.createElement("input");
  completedCheckbox.type = "checkbox";
  completedCheckbox.className = "task-complete-checkbox";
  completedCheckbox.checked = task.completed;
  completedCheckbox.setAttribute("aria-label", `Mark ${task.text} complete`);

  completedCheckbox.addEventListener("change", function () {
    setTaskCompleted(task, completedCheckbox.checked);
  });

  const titleText = document.createElement("span");
  titleText.className = "task-title-text";
  titleText.textContent = task.text;
  titleText.tabIndex = 0;
  titleText.setAttribute("role", "button");
  titleText.setAttribute(
    "aria-label",
    `${task.text}. Click to toggle complete. Double-click to edit.`
  );

  if (task.completed) {
    titleText.classList.add("completed");
  }

  const titleEditor = document.createElement("input");
  titleEditor.type = "text";
  titleEditor.className = "task-title-editor";
  titleEditor.value = task.text;
  titleEditor.hidden = true;
  titleEditor.setAttribute("aria-label", "Edit task title");

  let titleClickTimer = null;
  let isEditingTitle = false;

  titleText.addEventListener("click", function (event) {
    clearTimeout(titleClickTimer);

    if (event.detail > 1) {
      return;
    }

    titleClickTimer = setTimeout(function () {
      setTaskCompleted(task, !task.completed);
    }, 250);
  });

  titleText.addEventListener("dblclick", function () {
    clearTimeout(titleClickTimer);
    showTitleEditor();
  });

  titleText.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setTaskCompleted(task, !task.completed);
    }

    if (event.key === "F2") {
      event.preventDefault();
      showTitleEditor();
    }
  });

  titleEditor.addEventListener("blur", function () {
    saveTitleEdit();
  });

  titleEditor.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      titleEditor.blur();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelTitleEdit();
    }
  });

  function showTitleEditor() {
    isEditingTitle = true;
    titleText.hidden = true;
    titleEditor.hidden = false;
    titleEditor.value = task.text;
    titleEditor.focus();
    titleEditor.select();
  }

  function saveTitleEdit() {
    if (!isEditingTitle) {
      return;
    }

    const updatedText = titleEditor.value.trim();

    if (updatedText === "") {
      titleEditor.value = task.text;
      isEditingTitle = false;
      renderTasks();
      return;
    }

    task.text = updatedText;
    isEditingTitle = false;
    saveTasks();
    renderTasks();
  }

  function cancelTitleEdit() {
    isEditingTitle = false;
    renderTasks();
  }

  const taskPrioritySelect = createPrioritySelect(task);

  taskPrioritySelect.addEventListener("change", function () {
    task.priority = getValidPriority(taskPrioritySelect.value);
    saveTasks();
    renderTasks();
  });

  const priorityCell = document.createElement("div");
  priorityCell.classList.add(
    "task-priority-cell",
    `priority-${task.priority.toLowerCase()}`
  );

  const taskDueDateInput = document.createElement("input");
  taskDueDateInput.type = "date";
  taskDueDateInput.className = "task-due-date-input";
  taskDueDateInput.value = task.dueDate;
  taskDueDateInput.setAttribute("aria-label", "Task due date");

  taskDueDateInput.addEventListener("change", function () {
    task.dueDate = taskDueDateInput.value;
    saveTasks();
    renderTasks();
  });

  const actionsCell = document.createElement("div");
  actionsCell.className = "task-actions";

  const menuButton = document.createElement("button");
  menuButton.type = "button";
  menuButton.className = "task-menu-button";
  menuButton.textContent = "...";
  menuButton.setAttribute("aria-label", `Open actions for ${task.text}`);
  menuButton.setAttribute("aria-expanded", "false");

  const taskMenu = document.createElement("div");
  taskMenu.className = "task-menu";
  taskMenu.hidden = true;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "task-menu-item";
  deleteButton.textContent = "Delete";

  menuButton.addEventListener("click", function (event) {
    event.stopPropagation();
    const menuWasHidden = taskMenu.hidden;

    closeTaskMenus();
    taskMenu.hidden = !menuWasHidden;
    menuButton.setAttribute("aria-expanded", String(menuWasHidden));
  });

  deleteButton.addEventListener("click", function () {
    deleteTask(task.id);
  });

  actionsCell.appendChild(menuButton);
  actionsCell.appendChild(taskMenu);
  taskMenu.appendChild(deleteButton);
  titleCell.appendChild(completedCheckbox);
  titleCell.appendChild(titleText);
  titleCell.appendChild(titleEditor);
  priorityCell.appendChild(taskPrioritySelect);
  li.appendChild(titleCell);
  li.appendChild(priorityCell);
  li.appendChild(taskDueDateInput);
  li.appendChild(actionsCell);
  return li;
}

document.addEventListener("click", function () {
  closeTaskMenus();
});

document.addEventListener("keydown", function (event) {
  const isUndoShortcut =
    (event.ctrlKey || event.metaKey) &&
    !event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === "z";

  if (!isUndoShortcut || isEditableElement(event.target)) {
    return;
  }

  if (undoLastDeletedTask()) {
    event.preventDefault();
  }
});

function closeTaskMenus() {
  document.querySelectorAll(".task-menu").forEach(function (taskMenu) {
    taskMenu.hidden = true;
  });

  document.querySelectorAll(".task-menu-button").forEach(function (menuButton) {
    menuButton.setAttribute("aria-expanded", "false");
  });
}

markAllButton.addEventListener("click", function () {
  const tasks = getActiveTasks();
  const allTasksCompleted =
    tasks.length > 0 &&
    tasks.every(function (task) {
      return task.completed;
    });

  tasks.forEach(function (task) {
    task.completed = !allTasksCompleted;
  });

  saveTasks();
  renderTasks();
});

clearButton.addEventListener("click", function () {
  const shouldClearTasks = confirm(
    "Are you sure you want to clear the entire list?"
  );

  if (!shouldClearTasks) {
    return;
  }

  getActiveList().tasks = [];
  deletedTasks = [];
  saveTasks();
  renderTodoLists();
  renderTasks();
});

function deleteTask(taskId) {
  const tasks = getActiveTasks();
  const taskIndex = tasks.findIndex(function (task) {
    return task.id === taskId;
  });

  if (taskIndex === -1) {
    return;
  }

  const deletedTask = tasks.splice(taskIndex, 1)[0];

  deletedTasks.push({
    task: { ...deletedTask },
    index: taskIndex,
    listId: activeListId,
  });

  if (deletedTasks.length > MAX_DELETED_TASKS) {
    deletedTasks.shift();
  }

  saveTasks();
  renderTodoLists();
  renderTasks();
}

function undoLastDeletedTask() {
  const deletedTask = deletedTasks.pop();

  if (deletedTask === undefined) {
    return false;
  }

  const targetList = todoLists.find(function (todoList) {
    return todoList.id === deletedTask.listId;
  });

  if (targetList === undefined) {
    return false;
  }

  const restoreIndex = Math.min(deletedTask.index, targetList.tasks.length);
  targetList.tasks.splice(restoreIndex, 0, { ...deletedTask.task });
  activeListId = targetList.id;
  saveActiveListId();
  saveTasks();
  renderTodoLists();
  renderTasks();

  return true;
}

function isEditableElement(element) {
  if (element === null || element.tagName === undefined) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    element.isContentEditable
  );
}

function setTaskCompleted(task, completed) {
  task.completed = completed;
  saveTasks();
  renderTasks();
}

function saveTasks() {
  localStorage.setItem(LIST_STORAGE_KEY, JSON.stringify(todoLists));
}

function saveActiveListId() {
  localStorage.setItem(ACTIVE_LIST_STORAGE_KEY, activeListId);
}

function loadActiveListId(savedTodoLists) {
  const savedActiveListId = localStorage.getItem(ACTIVE_LIST_STORAGE_KEY);
  const savedListExists = savedTodoLists.some(function (todoList) {
    return todoList.id === savedActiveListId;
  });

  if (savedListExists) {
    return savedActiveListId;
  }

  return savedTodoLists[0].id;
}

function loadTodoLists() {
  const savedTodoLists = localStorage.getItem(LIST_STORAGE_KEY);

  if (savedTodoLists !== null) {
    try {
      const parsedTodoLists = JSON.parse(savedTodoLists);

      if (Array.isArray(parsedTodoLists) && parsedTodoLists.length > 0) {
        return parsedTodoLists.map(normalizeTodoList);
      }
    } catch (error) {
      return createDefaultTodoLists();
    }
  }

  return createDefaultTodoLists();
}

function createDefaultTodoLists() {
  return [
    {
      id: createListId(),
      name: "Main List",
      tasks: loadLegacyTasks(),
    },
  ];
}

function normalizeTodoList(todoList, index) {
  const fallbackName = index === 0 ? "Main List" : `List ${index + 1}`;

  if (todoList === null || typeof todoList !== "object") {
    return {
      id: createListId(),
      name: fallbackName,
      tasks: [],
    };
  }

  return {
    id: typeof todoList.id === "string" ? todoList.id : createListId(),
    name:
      typeof todoList.name === "string" && todoList.name.trim() !== ""
        ? todoList.name.trim()
        : fallbackName,
    tasks: Array.isArray(todoList.tasks)
      ? todoList.tasks.map(normalizeTask).filter(Boolean)
      : [],
  };
}

function loadLegacyTasks() {
  const savedTasks = localStorage.getItem(LEGACY_TASK_STORAGE_KEY);

  if (savedTasks === null) {
    return [];
  }

  try {
    const parsedTasks = JSON.parse(savedTasks);

    if (!Array.isArray(parsedTasks)) {
      return [];
    }

    return parsedTasks.map(normalizeTask).filter(Boolean);
  } catch (error) {
    return [];
  }
}

function normalizeTask(task) {
  if (
    task === null ||
    typeof task !== "object" ||
    typeof task.text !== "string" ||
    task.text.trim() === ""
  ) {
    return null;
  }

  return {
    id: typeof task.id === "string" ? task.id : createTaskId(),
    text: task.text,
    priority: getValidPriority(task.priority),
    dueDate: typeof task.dueDate === "string" ? task.dueDate : "",
    completed: Boolean(task.completed),
  };
}

function getValidPriority(priority) {
  if (priority === "Low" || priority === "Medium" || priority === "High") {
    return priority;
  }

  return "Medium";
}

function createPrioritySelect(task) {
  const taskPrioritySelect = document.createElement("select");
  taskPrioritySelect.className = "task-priority-select";
  taskPrioritySelect.setAttribute("aria-label", "Task priority");

  ["Low", "Medium", "High"].forEach(function (priority) {
    const priorityOption = document.createElement("option");
    priorityOption.value = priority;
    priorityOption.textContent = priority;
    taskPrioritySelect.appendChild(priorityOption);
  });

  taskPrioritySelect.value = task.priority;
  return taskPrioritySelect;
}

function getDueDateStatus(dueDate) {
  const today = getTodayDateString();

  if (dueDate < today) {
    return "overdue";
  }

  if (dueDate === today) {
    return "today";
  }

  return "future";
}

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createTaskId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createListId() {
  return `list-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getNextListName() {
  let listNumber = todoLists.length + 1;
  let listName = `New List ${listNumber}`;

  while (
    todoLists.some(function (todoList) {
      return todoList.name === listName;
    })
  ) {
    listNumber += 1;
    listName = `New List ${listNumber}`;
  }

  return listName;
}
