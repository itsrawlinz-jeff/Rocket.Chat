// import { afterAll } from '../hooks';
import { processPresenceAndStatus } from '../lib/processConnectionStatus';
import { getCollection, Collections } from '../../mongo';
import { IUserSession } from '../../../../../definition/IUserSession';
import { IUser } from '../../../../../definition/IUser';
import { USER_STATUS } from '../../../../../definition/UserStatus';
import { api } from '../../../../../server/sdk/api';

const projection = {
	projection: {
		username: 1,
		statusDefault: 1,
		statusText: 1,
	},
};

export async function updateUserPresence(uid: string): Promise<void> {
	const query = { _id: uid };

	const UserSession = await getCollection<IUserSession>(Collections.UserSession);
	const User = await getCollection<IUser>(Collections.User);

	const user = await User.findOne<IUser>(query, projection);
	if (!user) { return; }

	const userSessions = await UserSession.findOne(query) || { connections: [], metadata: undefined };
	const { statusDefault = USER_STATUS.OFFLINE } = user;
	const { status, statusConnection } = processPresenceAndStatus(userSessions.connections, statusDefault);

	// if (userSessions.metadata?.visitor) {
	// 	api.broadcast('visitopresence', {
	// 		action: 'updated',
	// 		// user: { _id: uid, username: user.username, status, statusText: user.statusText },
	// 		metadata: userSessions.metadata,
	// 	});
	// 	return;
	// }

	const result = await User.updateOne(query, {
		$set: { status, statusConnection },
	});

	if (result.modifiedCount > 0) {
		api.broadcast('userpresence', {
			action: 'updated',
			user: { _id: uid, username: user.username, status, statusText: user.statusText },
			metadata: userSessions.metadata,
		});
	}
}
