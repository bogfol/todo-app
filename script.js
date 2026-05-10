const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const prioritySelect = document.getElementById("todo-priority");
const list = document.getElementById("todo-list");

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const taskText = input.value.trim();

  if (taskText === "") {
    return;
  }

  addTask(taskText, prioritySelect.value);
  input.value = "";
});

function addTask(taskText, priority = "Medium") {
  const li = document.createElement("li");
  li.dataset.priority = priority;

  const taskContent = document.createElement("div");
  taskContent.className = "task-content";

  const span = document.createElement("span");
  span.className = "task-text";
  span.textContent = taskText;

  span.addEventListener("click", function () {
    span.classList.toggle("completed");
  });

  const priorityBadge = document.createElement("span");
  priorityBadge.classList.add(
    "priority-badge",
    `priority-${priority.toLowerCase()}`
  );
  priorityBadge.textContent = priority;

  const deleteButton = document.createElement("button");
  deleteButton.textContent = "Delete";

  deleteButton.addEventListener("click", function () {
    li.remove();
  });

  taskContent.appendChild(span);
  taskContent.appendChild(priorityBadge);
  li.appendChild(taskContent);
  li.appendChild(deleteButton);
  list.appendChild(li);
}
