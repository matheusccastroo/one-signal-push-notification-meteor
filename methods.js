Meteor.methods({
  'oneSignal#setPlayerId'({ playerId }) {
    check(playerId, String);

    if (this.isSimulation) {
      return;
    }

    const userId = this.userId;
    if (!userId) {
      throw new Meteor.Error(403, 'You need to be logged in');
    }

    return Meteor.users.update(userId, { $addToSet: { playerIds: playerId } });
  },
  'oneSignal#unsetPlayerId'({ playerId }) {
    check(playerId, String);

    if (this.isSimulation) {
      return;
    }

    return Meteor.users.update(
      { playerIds: [playerId] },
      { $pull: { playerIds: { $in: [playerId] } } },
      { multi: true }
    );
  },
});
