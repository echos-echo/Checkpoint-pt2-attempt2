/* eslint-disable no-unused-expressions */
/* eslint-env mocha, chai */
const helper = require('../../helper');
const expect = require('chai').expect;
const db = require('../../models/sequelize-models/database');
const { Task, Owner } = require('../../models/sequelize-models');

/**
 * Start here
 *
 * These tests describe the model that you'll be setting up in models/task.model.js
 *
 */

describe('Task and Owner', function () {
  // clear the database before all tests
  before(() => {
    return db.sync({ force: true });
  });

  // erase all tasks after each spec
  afterEach(() => {
    return db.sync({ force: true });
  });

  describe('Class methods on Task', function () {
    beforeEach(async () => {
      await Promise.all([
        Task.create({ name: 't1', due: helper.dates.tomorrow() }),
        Task.create({
          name: 't2',
          due: helper.dates.tomorrow(),
          complete: true,
        }),
        Task.create({ name: 't3', due: helper.dates.yesterday() }),
        Task.create({
          name: 't4',
          due: helper.dates.yesterday(),
          complete: true,
        }),
      ]);
    });

    describe('clearCompleted', function () {
      it('removes all completed tasks from the database', async function () {
        await Task.clearCompleted();

        const completedTasks = await Task.findAll({
          where: { complete: true },
        });
        const incompleteTasks = await Task.findAll({
          where: { complete: false },
        });

        expect(completedTasks).to.have.length(0);
        expect(incompleteTasks).to.have.length(2);
      });
    });

    describe('completeAll', function () {
      it('marks all incomplete tasks as completed', async function () {
        await Task.completeAll();

        const completedTasks = await Task.findAll({
          where: { complete: true },
        });
        const incompleteTasks = await Task.findAll({
          where: { complete: false },
        });

        expect(completedTasks).to.have.length(4);
        expect(incompleteTasks).to.have.length(0);
      });
    });
  });

  describe.only('Instance methods on Task', function () {
    describe('getTimeRemaining', function () {
      it('returns the Infinity value if task has no due date', function () {
        const task = Task.build();
        expect(task.getTimeRemaining()).to.equal(Infinity);
      });

      it('returns the difference between due date and now', function () {
        const oneDay = 24 * 60 * 60 * 1000; // one day in milliseconds

        // create a task due one day from this point in time
        const task = Task.build({
          due: helper.dates.tomorrow(),
        });

        expect(task.getTimeRemaining()).to.be.closeTo(oneDay, 10); // within 10 ms
      });
    });

    describe('isOverdue', function () {
      xit('is overdue if the due date is in the past', function () {
        const task = Task.build({
          due: helper.dates.yesterday(),
        });
        expect(task.isOverdue()).to.be.true;
      });

      xit('is not overdue if the due date is in the past but complete is true', function () {
        const task = Task.build({
          due: helper.dates.yesterday(),
          complete: true,
        });
        expect(task.isOverdue()).to.be.false;
      });

      xit('is not overdue if the due date is in the future', function () {
        const task = Task.build({
          due: helper.dates.tomorrow(),
        });
        expect(task.isOverdue()).to.be.false;
      });
    });

    describe('assignOwner', function () {
      /*
        Hint: Remember magic methods?
        They are methods generated by Sequelize after associations have been set
        https://medium.com/@jasmine.esplago.munoz/feeling-the-magic-with-sequelize-magic-methods-e9cc89ecdcc5
      */

      xit('should associate a task to an owner and return a promise', async function () {
        const task = await Task.create({ name: 'make pizza' });
        const owner = await Owner.create({ name: 'Priti' });

        const associatedTask = await task.assignOwner(owner);

        expect(associatedTask.OwnerId).to.equal(owner.id);
      });
    });
  });

  describe('Class methods on Owner', function () {
    let owners;
    beforeEach(async function () {
      owners = await Owner.bulkCreate([
        { name: 'Natalie' },
        { name: 'Ben' },
        { name: 'Orlando' },
      ]);
      const [natalie, ben] = owners;
      await Task.bulkCreate([
        { name: 'buy groceries', OwnerId: natalie.id },
        { name: 'learn python', OwnerId: natalie.id },
        { name: 'bake a cake', OwnerId: ben.id },
      ]);
    });

    describe('getOwnersAndTasks', function () {
      /*
        Hint: This is a good time to review eager loading
        https://sequelize.org/master/manual/eager-loading.html
      */

      xit('returns all owners and includes their assigned tasks', async function () {
        const ownersAndTasks = await Owner.getOwnersAndTasks();
        expect(ownersAndTasks).to.have.lengthOf(3);
        const ownersNames = ownersAndTasks.map((owner) => owner.name);
        expect(ownersNames).to.have.members(['Natalie', 'Ben', 'Orlando']);
        ownersAndTasks.forEach((owner) => {
          expect(owner).to.have.property('Tasks');
          if (owner.name === 'Natalie') {
            const taskNames = owner.Tasks.map((task) => task.name);
            expect(taskNames).to.have.members([
              'buy groceries',
              'learn python',
            ]);
          }
        });
      });
    });
  });

  describe('Instance methods on Owner', function () {
    describe('getIncompleteTasks', function () {
      xit('returns all incomplete tasks assigned to an owner', async function () {
        const taskData = [
          { name: 'get groceries', complete: true },
          { name: 'make dinner', complete: true },
          { name: 'clean home' },
          { name: 'bake a cake' },
        ];
        const owner = await Owner.create({ name: 'Finn' });

        const createdTasks = await Task.bulkCreate(taskData, {
          returning: true,
        });

        await Promise.all(
          createdTasks.map(async (task) => {
            await task.setOwner(owner);
          })
        );

        const ownerWithAssociatedTasks = await Owner.findByPk(owner.id);
        const incompleteTasks = await ownerWithAssociatedTasks.getIncompleteTasks();

        expect(incompleteTasks).to.have.length(2);
      });
    });
  });

  describe('Lifecycle Hooks on Owner', function () {
    /*
        Hint: This is a good time to review instance hooks:
        https://sequelize.org/master/manual/hooks.html#instance-hooks

        Note the difference between instance lifecycle hooks and model lifecycle
        hooks.

        // This would trigger the Owner.beforeBulkDestroy model hook
        await Owner.destroy({where: {...}});

        // This would trigger the Owner.beforeDestroy instance hook
        const someOwner = await Owner.findByPk(4);
        await someOwner.destroy();
    */

    beforeEach(async function () {
      await Owner.bulkCreate([
        { name: 'Grace Hopper' },
        { name: 'Alan Turing' },
      ]);
    });

    describe('beforeDestroy Instance Hook', function () {
      xit("attempting to destroy owners named 'Grace Hopper' throws an error", async function () {
        const graceHopper = await Owner.findOne({
          where: {
            name: 'Grace Hopper',
          },
        });
        const alanTuring = await Owner.findOne({
          where: {
            name: 'Alan Turing',
          },
        });
        // Destroying Alan Turing should still work.
        await alanTuring.destroy();
        // Destroying Grace Hopper should not work.
        await expect(graceHopper.destroy()).to.be.rejected;
      });
    });
  });
});
