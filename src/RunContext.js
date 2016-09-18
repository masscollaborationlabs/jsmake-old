class RunContext {
    constructor(owner) {
        this.owner = owner;

        this.executionQueue = [];
    }

    setArgv(argv) {
        this.argv = argv;
    }

    setArgs(args) {
        this.argv = this.owner.utils.parseArgv(args);
    }

    addTask(task) {
        for (const prerequisite of task.prerequisites) {
            const prerequisiteTask = this.owner.tasks[prerequisite];

            this.addTask(prerequisiteTask);
        }

        if (this.executionQueue.indexOf(task.name) >= 0) {
            return;
        }

        const preTaskName = `pre-${task.name}`,
            postTaskName = `post-${task.name}`;

        if (preTaskName in this.owner.tasks) {
            this.addTask(this.owner.tasks[preTaskName]);
        }

        this.executionQueue.push(task.name);

        if (postTaskName in this.owner.tasks) {
            this.addTask(this.owner.tasks[postTaskName]);
        }
    }

    validateArgvAndGetTask() {
        let taskname;

        if (this.argv._.length === 0) {
            taskname = 'default';
        }
        else {
            taskname = this.argv._.shift();
        }

        if (!(taskname in this.owner.tasks)) {
            throw new Error({
                message: `unknown task name - ${taskname}`,
                error: this.owner.errors.unknownTask,
                taskname: taskname
            });
        }

        return this.owner.tasks[taskname];
    }

    async runExecutionQueue() {
        let task;

        try {
            while (this.executionQueue.length > 0) {
                const taskname = this.executionQueue.shift();

                task = this.owner.tasks[taskname];

                this.owner.logger.debug('running task ${task.name}');

                await task.execute(this.argv, this);
            }
        }
        catch (ex) {
            throw new Error({
                message: 'exception is thrown during task execution',
                error: this.owner.errors.exception,
                exception: ex,
                task: task
            });
        }
    }

    async execute() {
        const task = this.validateArgvAndGetTask();

        this.addTask(task);

        await this.runExecutionQueue();
    }
}

export default RunContext;
