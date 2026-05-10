const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const clearButton = document.getElementById("clear-button");

form.addEventListener("submit", function (event) {
	event.preventDefault();

	const taskText = input.value.trim();

	if (taskText === "") {
		return;
	}

	addTask(taskText);
	input.value = "";
});

function addTask(taskText) {
	const li = document.createElement("li");

	const span = document.createElement("span");
	span.textContent = taskText;

	span.addEventListener("click", function () {
		span.classList.toggle("completed");
	});

	const deleteButton = document.createElement("button");
	deleteButton.textContent = "Delete";

	deleteButton.addEventListener("click", function () {
		li.remove();
	});

	li.appendChild(span);
	li.appendChild(deleteButton);
	list.appendChild(li);
}

clearButton.addEventListener("click", function () {
	list.innerHTML = "";
});